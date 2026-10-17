/* Fetch a public web page as plain text for the Locator import. Guards
 * against SSRF: http(s) only, every hop's host is resolved and refused when
 * any address is loopback, private, link-local (cloud metadata) or
 * unspecified; redirects are followed by hand (max 3) so each hop is
 * re-checked. 10 s overall, 2 MB body, text/html or text/plain only. */

import "server-only";

import { promises as dns } from "node:dns";
import { isIP } from "node:net";

export type FetchedPage = { finalUrl: string; title: string | null; text: string; site: string | null };

export class FetchPageError extends Error {}

const TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_CHARS = 40_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export async function fetchPageText(url: string): Promise<FetchedPage> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    let current = parseHttpUrl(url);
    for (let hop = 0; ; hop++) {
      await assertPublicHost(current.hostname);
      const res = await fetch(current, {
        redirect: "manual",
        signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
          "accept-language": "en-US,en;q=0.9",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        await res.body?.cancel();
        if (!location) throw new FetchPageError(`redirect (${res.status}) without a location`);
        if (hop >= MAX_REDIRECTS) throw new FetchPageError("too many redirects");
        current = parseHttpUrl(new URL(location, current).toString());
        continue;
      }
      if (!res.ok) {
        await res.body?.cancel();
        throw new FetchPageError(`the site answered HTTP ${res.status}`);
      }

      const contentType = res.headers.get("content-type") ?? "";
      const mime = contentType.split(";")[0].trim().toLowerCase();
      if (mime !== "text/html" && mime !== "text/plain" && mime !== "application/xhtml+xml") {
        await res.body?.cancel();
        throw new FetchPageError(`not a web page (${mime || "unknown type"})`);
      }

      const raw = await readCapped(res, charsetOf(contentType));
      const finalUrl = current.toString();
      if (mime === "text/plain") {
        return { finalUrl, title: null, site: null, text: cap(collapseWhitespace(raw)) };
      }
      return { finalUrl, ...htmlToText(raw) };
    }
  } catch (err) {
    if (err instanceof FetchPageError) throw err;
    if (signal.aborted || (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"))) {
      throw new FetchPageError("it took longer than 10 seconds");
    }
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : null;
    throw new FetchPageError(cause ?? (err instanceof Error ? err.message : "network error"));
  }
}

/* ---------- URL and address checks ---------- */

function parseHttpUrl(input: string): URL {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new FetchPageError("that isn't a valid link");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new FetchPageError("only http and https links work");
  if (u.username || u.password) throw new FetchPageError("links with credentials aren't allowed");
  return u;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) throw new FetchPageError("that address is not public");
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = (await dns.lookup(host, { all: true, verbatim: true })).map((a) => a.address);
    } catch {
      throw new FetchPageError(`couldn't find ${host}`);
    }
  }
  if (addresses.length === 0) throw new FetchPageError(`couldn't find ${host}`);
  if (addresses.some(isBlockedAddress)) throw new FetchPageError("that address is not public");
}

/** Loopback, private, link-local, unspecified (and IPv4-mapped forms of them). */
export function isBlockedAddress(address: string): boolean {
  const v = isIP(address);
  if (v === 4) return isBlockedV4(address);
  if (v !== 6) return true;
  const a = address.toLowerCase().split("%")[0];
  const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedV4(mapped[1]);
  const groups = expandV6(a);
  if (!groups) return true;
  if (groups.every((g) => g === 0)) return true; // ::
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true; // ::1
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    // ::ffff:a.b.c.d written in hex
    return isBlockedV4(`${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`);
  }
  if ((groups[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((groups[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}

function isBlockedV4(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 || // 0/8
    a === 10 || // 10/8
    a === 127 || // 127/8
    (a === 169 && b === 254) || // 169.254/16 (metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16/12
    (a === 192 && b === 168) // 192.168/16
  );
}

function expandV6(a: string): number[] | null {
  let s = a;
  const v4 = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const p = v4[1].split(".").map(Number);
    s = s.slice(0, -v4[1].length) + `${((p[0] << 8) | p[1]).toString(16)}:${((p[2] << 8) | p[3]).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  const parts = [...head, ...Array(Math.max(fill, 0)).fill("0"), ...tail];
  if (parts.length !== 8) return null;
  const nums = parts.map((p) => parseInt(p, 16));
  return nums.some((n) => Number.isNaN(n)) ? null : nums;
}

/* ---------- Body ---------- */

function charsetOf(contentType: string): string {
  const m = contentType.match(/charset\s*=\s*"?([\w.:-]+)"?/i);
  return m ? m[1].toLowerCase() : "utf-8";
}

async function readCapped(res: Response, charset: string): Promise<string> {
  let decoder: TextDecoder;
  try {
    decoder = new TextDecoder(charset);
  } catch {
    decoder = new TextDecoder("utf-8");
  }
  if (!res.body) return "";
  const reader = res.body.getReader();
  let total = 0;
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const room = MAX_BYTES - total;
    const chunk = value.byteLength > room ? value.subarray(0, room) : value;
    total += chunk.byteLength;
    out += decoder.decode(chunk, { stream: true });
    if (total >= MAX_BYTES) {
      await reader.cancel();
      break;
    }
  }
  return out + decoder.decode();
}

/* ---------- HTML to text (exported for tests; pure) ---------- */

export function htmlToText(html: string): { title: string | null; text: string; site: string | null } {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const title = titleMatch ? collapseWhitespace(decodeEntities(titleMatch[1].replace(/<[^>]*>/g, ""))) || null : null;
  const site = metaContent(html, "og:site_name");
  // Script-rendered pages often have an empty body; their meta description still says something.
  const summary = metaContent(html, "description") ?? metaContent(html, "og:description");

  let body = html.replace(/<!--[\s\S]*?-->/g, " ");
  body = body.replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, " ");
  for (const tag of ["script", "style", "noscript", "svg", "nav", "footer", "header", "template", "iframe"]) {
    body = body.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), " ");
  }
  body = body
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/?(p|div|section|article|main|aside|li|ul|ol|tr|table|h[1-6]|dt|dd|dl|blockquote|pre)\b[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ");

  const text = collapseWhitespace(decodeEntities(body));
  const withSummary = summary && !text.includes(summary) ? `${summary}\n\n${text}`.trim() : text;
  return { title, site, text: cap(withSummary) };
}

function metaContent(html: string, property: string): string | null {
  for (const m of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const key = tag.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
    if (key?.toLowerCase() !== property) continue;
    const content = tag.match(/\bcontent\s*=\s*"([^"]*)"/i)?.[1] ?? tag.match(/\bcontent\s*=\s*'([^']*)'/i)?.[1];
    const v = content ? collapseWhitespace(decodeEntities(content)) : "";
    return v || null;
  }
  return null;
}

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ent: string) => {
    if (ent[0] === "#") {
      const code = ent[1] === "x" || ent[1] === "X" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return " ";
      return code === 0xa0 ? " " : String.fromCodePoint(code);
    }
    return NAMED[ent.toLowerCase()] ?? whole;
  });
}

function collapseWhitespace(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cap(s: string): string {
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS) : s;
}
