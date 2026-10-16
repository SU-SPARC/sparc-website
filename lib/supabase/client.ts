/* Browser client: the signed-in user's session from cookies, RLS as that
 * user. Use in client components (uploads go browser -> Storage directly). */

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey());
}
