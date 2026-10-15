/* Cookie-less read client for public pages. It runs as `anon`, so only
 * published rows come back, and because it never touches cookies() the
 * calling route stays static / ISR. Server only. */

import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

export function createPublicClient() {
  return createClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
