/* Environment access for the Supabase clients.
 *
 * NEXT_PUBLIC_* variables are inlined at build time only when referenced
 * literally as `process.env.NEXT_PUBLIC_…`, so each getter names its variable
 * in full instead of indexing process.env dynamically. Safe to import from
 * client code: nothing secret is read here (the secret key is read only in
 * ./admin.ts, which is server-only). */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local ` +
        `and fill it in (local values: \`supabase status -o env\`).`,
    );
  }
  return value;
}

/** NEXT_PUBLIC_SUPABASE_URL, e.g. http://127.0.0.1:55321 or https://<ref>.supabase.co */
export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

/** NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (falls back to NEXT_PUBLIC_SUPABASE_ANON_KEY). */
export function supabasePublishableKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** NEXT_PUBLIC_SITE_URL without a trailing slash, for auth redirect links. */
export function siteUrl(): string {
  return required("NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL).replace(/\/+$/, "");
}
