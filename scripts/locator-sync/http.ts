/* HTTP for the sync: browser-like User-Agent, 20 s per attempt, one retry on
 * network errors / timeouts / 429 / 5xx, redirects followed by hand (max 3)
 * and refused when a hop resolves to a loopback, private or link-local
 * address. The address check is copied from lib/ai/fetch-page.ts, which is
 * server-only and cannot be imported from a script. */

import { promises as dns } from "node:dns";
import { isIP } from "node:net";

import type { Http } from "./types";

const TIMEOUT_MS = 20_000;
const MAX_REDIRECTS = 3;
const RETRY_DELAY_MS = 1_500;
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
  ) {
    super(message);
  }
}

type Init = { method?: "GET" | "POST"; body?: unknown; headers?: Record<string, string> };

async function once(url: string, init: Init, accept: string): Promise<Response> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  let current = new URL(url);
  for (let hop = 0; ; hop++) {
    if (current.protocol !== "https:" && current.protocol !== "http:") throw new HttpError(`refused ${current.protocol} URL`);
    await assertPublicHost(current.hostname);
    const res = await fetch(current, {
      method: hop === 0 ? (init.method ?? "GET") : "GET",
      redirect: "manual",
      signal,
      headers: {
        "user-agent": USER_AGENT,
        accept,
        "accept-language": "en-US,en;q=0.9",
        ...(init.body !== undefined && hop === 0 ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
      body: init.body !== undefined && hop === 0 ? JSON.stringify(init.body) : undefined,
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new HttpError(`redirect (${res.status}) without a location`, res.status);
      if (hop >= MAX_REDIRECTS) throw new HttpError("too many redirects", res.status);
      current = new URL(location, current);
      continue;
    }
    return res;
  }
}

async function request(url: string, init: Init, accept: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null;
    let err: unknown = null;
    try {
      res = await once(url, init, accept);
    } catch (e) {
      if (e instanceof HttpError) throw e; // refused address / redirect problems: retrying will not help
      err = e;
    }
    const retryable = err !== null || (res !== null && (res.status === 429 || res.status >= 500));
    if (retryable && attempt === 0) {
      await res?.body?.cancel();
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }
    if (err !== null) {
      const e = err as Error;
      if (e.name === "TimeoutError" || e.name === "AbortError") throw new HttpError(`${host(url)} took longer than 20 s`);
      const cause = e.cause instanceof Error ? e.cause.message : null;
      throw new HttpError(`${host(url)}: ${cause ?? e.message}`);
    }
    if (!res!.ok) {
      await res!.body?.cancel();
      throw new HttpError(`${host(url)} answered HTTP ${res!.status}`, res!.status);
    }
    return res!;
  }
}

function host(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export const http: Http = {
  async json<T>(url: string, init: Init = {}): Promise<T> {
    const res = await request(url, init, "application/json");
    const body = await res.text();
    try {
      return JSON.parse(body) as T;
    } catch {
      throw new HttpError(`${host(url)} did not return JSON`);
    }
  },
  async text(url: string, init: Init = {}): Promise<string> {
    const res = await request(url, init, "text/html,text/calendar,text/plain;q=0.9,*/*;q=0.1");
    return res.text();
  },
};

// ── address checks (copied from lib/ai/fetch-page.ts) ────────────────────

async function assertPublicHost(hostname: string): Promise<void> {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost")) throw new HttpError(`${h} is not a public address`);
  let addresses: string[];
  if (isIP(h)) {
    addresses = [h];
  } else {
    try {
      addresses = (await dns.lookup(h, { all: true, verbatim: true })).map((a) => a.address);
    } catch {
      throw new HttpError(`couldn't resolve ${h}`);
    }
  }
  if (addresses.length === 0) throw new HttpError(`couldn't resolve ${h}`);
  if (addresses.some(isBlockedAddress)) throw new HttpError(`${h} is not a public address`);
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
  if (groups.every((g) => g === 0)) return true;
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true;
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    return isBlockedV4(`${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`);
  }
  if ((groups[0] & 0xfe00) === 0xfc00) return true;
  if ((groups[0] & 0xffc0) === 0xfe80) return true;
  return false;
}

function isBlockedV4(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) // 100.64/10 carrier-grade NAT
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
