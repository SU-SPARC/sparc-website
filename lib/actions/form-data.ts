/* Small zod + FormData helpers shared by the server actions. Not a
 * "use server" module (those may only export async functions). */

import { z } from "zod";

import type { FieldErrors, FormState } from "./form-state";

/** FormData → plain object of strings (last value wins; files dropped). */
export function formObject(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") out[k] = v;
  return out;
}

/** Trimmed text; "" → null. */
export const zOptText = z
  .string()
  .optional()
  .transform((v) => {
    const t = (v ?? "").trim();
    return t === "" ? null : t;
  });

/** Required trimmed text. */
export const zText = (label: string, max = 300) =>
  z
    .string({ error: `Enter ${label}.` })
    .transform((v) => v.trim())
    .pipe(z.string().min(1, { error: `Enter ${label}.` }).max(max, { error: `Keep it under ${max} characters.` }));

/** Optional http(s) URL; "" → null. */
export const zOptUrl = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .pipe(
    z.union([
      z.literal("").transform(() => null),
      z.url({ protocol: /^https?$/, error: "Enter a full link starting with https://" }),
    ]),
  );

/** Required http(s) URL. */
export const zUrl = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.url({ protocol: /^https?$/, error: "Enter a full link starting with https://" }));

/** Switch ("true"/"false") or checkbox ("on"/absent) → boolean. */
export const zBool = z
  .string()
  .optional()
  .transform((v) => v === "true" || v === "on");

/** 'YYYY-MM-DD' (date input). */
export const zDateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a date." });

export const zOptDateOnly = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .pipe(z.union([z.literal("").transform(() => null), zDateOnly]));

export function zodFail(error: z.ZodError, extra?: FieldErrors): FormState {
  const fe = z.flattenError(error).fieldErrors as FieldErrors;
  return { fieldErrors: { ...fe, ...extra } };
}

export function ok(data?: FormState["data"]): FormState {
  return { ok: true, savedAt: new Date().toISOString(), data };
}

/** Postgres unique violation → friendly message. */
export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}

/** Notice query string for a redirect back to a list. */
export function withNotice(path: string, message: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}notice=${encodeURIComponent(message)}`;
}
