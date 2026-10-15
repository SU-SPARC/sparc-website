/* Service client with the secret key: BYPASSES RLS. Only for server actions
 * that have already verified the caller (e.g. requireAdmin()) and need the
 * Auth admin API (create/invite users, reset passwords), and for scripts.
 * Never import from client code; `server-only` makes that a build error. */

import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { supabaseUrl } from "./env";

export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing environment variable SUPABASE_SECRET_KEY (server only; `supabase status -o env` → SECRET_KEY).",
    );
  }
  return createClient<Database>(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
