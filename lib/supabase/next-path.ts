/* Open-redirect guard for `?next=` parameters (login, /auth/confirm).
 * Returns a same-origin path (path + search + hash) or the fallback. */

const BASE = "http://next-path.invalid";

export function safeNextPath(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw) return fallback;
  // Only absolute paths; reject protocol-relative ("//x") and backslash tricks ("/\x").
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  let url: URL;
  try {
    url = new URL(raw, BASE);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE) return fallback;
  const path = url.pathname + url.search + url.hash;
  // Never bounce back into the login page itself.
  if (url.pathname === "/login") return fallback;
  return path;
}
