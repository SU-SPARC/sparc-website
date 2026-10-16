/* Session refresh for Next 16's proxy (the root proxy.ts calls this).
 *
 * Refreshes the auth cookie on every matched request and bounces signed-out
 * visitors off /admin and /dashboard to /login?next=<path>. This is a
 * convenience only: layouts re-check the role on the server and RLS is the
 * real guard (server actions POST to page routes and must re-check too). */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";
import { safeNextPath } from "./next-path";

const PROTECTED = ["/admin", "/dashboard"];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  if (!signedIn && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", safeNextPath(pathname + search, "/dashboard"));
    const redirect = NextResponse.redirect(url);
    // Carry any refreshed/cleared auth cookies over to the redirect.
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  }

  // Return supabaseResponse as-is so the refreshed cookies reach the browser.
  return supabaseResponse;
}
