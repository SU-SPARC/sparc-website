"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { formObject, ok, zodFail, zOptText } from "./form-data";
import type { FormState } from "./form-state";

/** Comma-separated list → trimmed, unique (case-insensitive), original case kept. */
const zList = z
  .string()
  .optional()
  .transform((v) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of (v ?? "").split(",").map((s) => s.trim())) {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  })
  .pipe(z.array(z.string().max(60, { error: "Keep each item under 60 characters." })).max(40, { error: "Keep it to 40 items." }));

const zMax = (max: number) => zOptText.pipe(z.string().max(max, { error: `Keep it under ${max} characters.` }).nullable());

const CareerProfileShape = z.object({
  major: zMax(120),
  minor: zMax(120),
  degree_level: z.enum(["undergrad", "grad", "other"], { error: "Pick a degree level." }),
  expected_grad_year: zOptText.pipe(
    z.union([
      z.null(),
      z
        .string()
        .regex(/^\d{4}$/, { error: "Enter a year like 2027." })
        .transform(Number)
        .pipe(
          z
            .number()
            .min(2020, { error: "Enter a year between 2020 and 2040." })
            .max(2040, { error: "Enter a year between 2020 and 2040." }),
        ),
    ]),
  ),
  skills: zList,
  interests: zList,
  goals: zMax(2000),
  constraints: zMax(2000),
  work_auth: z
    .enum(["us_citizen_or_pr", "needs_sponsorship", "international_cpt_opt", "prefer_not_to_say"], {
      error: "Pick an option.",
    })
    .optional()
    .default("prefer_not_to_say"),
});

/** Upserts the caller's own Locator profile (RLS: own row only). */
export async function saveCareerProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user } = await requireUser("/admin/locator/profile");
  const parsed = CareerProfileShape.safeParse(formObject(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("career_profiles")
    .upsert({ profile_id: user.id, ...parsed.data }, { onConflict: "profile_id" });
  if (error) return { error: `Couldn't save: ${error.message}` };
  revalidatePath("/admin/locator", "layout");
  return ok();
}
