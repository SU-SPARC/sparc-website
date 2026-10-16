/* Print a one-time sign-in link for an existing account.
 *
 * For when nobody can get in and email isn't set up: a locked-out e-board
 * admin, a member who lost a temporary password before SMTP exists. The link
 * goes through the site's /auth/confirm route, signs the person in, and lands
 * on /dashboard/profile, where they set a new password. It works once and
 * expires after about an hour.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
 *   NEXT_PUBLIC_SITE_URL=https://sparc-su.vercel.app \
 *   SUPABASE_SECRET_KEY=<service_role key> \
 *   npm run admin:magic-link -- someone@example.com
 *
 * Values set in the shell override .env.local, so the same command works
 * against the local stack with nothing set. Send the printed link only to the
 * account's owner; it is a credential. */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const email = process.argv[2]?.trim().toLowerCase();

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (env or .env.local)");
  process.exit(1);
}
if (!email || !email.includes("@")) {
  console.error("Usage: npm run admin:magic-link -- email@example.com");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error(`generateLink: ${error.message}`);
  process.exit(1);
}

const tokenHash = data.properties?.hashed_token;
if (!tokenHash) {
  console.error("No token returned; does the account exist?");
  process.exit(1);
}

const link = `${site}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent("/dashboard/profile")}`;
console.log("");
console.log(`One-time sign-in link for ${email} (works once, expires in about an hour):`);
console.log("");
console.log(link);
console.log("");
console.log("Open it in a browser, then set a new password on the profile page.");
