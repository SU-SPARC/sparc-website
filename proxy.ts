/* Next 16 proxy (formerly middleware). Refreshes the Supabase session cookie
 * and bounces signed-out visitors off /admin and /dashboard to
 * /login?next=<path> (logic in lib/supabase/proxy.ts).
 *
 * The matcher is narrow on purpose: public pages are static and never read
 * the session, so they should not invoke the proxy. Server actions POST to
 * page routes, so every action re-checks auth itself; layouts re-check the
 * role; RLS is the real guard. */

import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/login", "/forgot-password", "/auth/:path*"],
};
