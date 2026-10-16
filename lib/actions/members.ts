"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { editorSession, moveInOrder, nextSortOrder, revalidateSite, takenBy } from "./content-helpers";
import { ok, withNotice, zodFail, zOptText, zOptUrl, zText } from "./form-data";
import type { FormState } from "./form-state";
import { cleanupMedia, imageFieldError, readImageField, resolveImageField } from "./media-helpers";

const lines = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split(/\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  );

const MemberShape = z.object({
  name: zText("a name", 120),
  slug: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Lowercase letters, digits and dashes only." })),
  nickname: zOptText,
  class_year: z.coerce
    .number({ error: "Enter a year like 2027." })
    .int({ error: "Enter a year like 2027." })
    .min(1990, { error: "Enter a year like 2027." })
    .max(2100, { error: "Enter a year like 2027." }),
  status: z.enum(["current", "alumni"], { error: "Pick current or alumni." }),
  role: zOptText,
  role_term: zOptText,
  role_history: lines,
  bio: zOptText.pipe(z.string().max(600, { error: "Keep it under 600 characters." }).nullable()),
  linkedin: zOptUrl,
  website: zOptUrl,
  eboard: z.string().optional().transform((v) => v === "true" || v === "on"),
  published: z.string().optional().transform((v) => v === "true" || v === "on"),
});

function readBadges(fd: FormData): string[] {
  const picked = fd.getAll("badges").map(String);
  const extra = String(fd.get("badges_extra") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...picked, ...extra])].filter((b) => /^[a-z0-9-]{1,40}$/.test(b));
}

function readYears(fd: FormData): number[] | string {
  const raw = [
    ...fd.getAll("participated").map(String),
    ...String(fd.get("participated_extra") ?? "").split(","),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  const years = raw.map(Number);
  if (years.some((y) => !Number.isInteger(y) || y < 1990 || y > 2100)) return "Years like 2025, 2026.";
  return [...new Set(years)].sort((a, b) => a - b);
}

export async function saveMember(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await editorSession();
  const id = (fd.get("id") as string | null) || null;
  const parsed = MemberShape.safeParse(Object.fromEntries(fd));
  const photo = readImageField(fd, "photo");
  const photoError = imageFieldError(photo, false);
  const years = readYears(fd);
  const extra = {
    ...(photoError ? { photo: [photoError] } : {}),
    ...(typeof years === "string" ? { participated_extra: [years] } : {}),
  };
  if (!parsed.success) return zodFail(parsed.error, extra);
  if (Object.keys(extra).length) return { fieldErrors: extra };
  const v = parsed.data;

  const slugTaken = await takenBy(supabase, "members", "slug", v.slug, id, (r) => String(r.name));
  if (slugTaken) return { fieldErrors: { slug: [slugTaken] } };

  let oldPhoto: string | null = null;
  if (id) {
    const { data } = await supabase.from("members").select("photo_media_id").eq("id", id).maybeSingle();
    oldPhoto = data?.photo_media_id ?? null;
  }
  const media =
    photo === undefined || photo === "invalid"
      ? { id: oldPhoto }
      : await resolveImageField(supabase, photo, "members", { updateExistingAlt: true });
  if ("error" in media) return { fieldErrors: { photo: [media.error] } };

  const row = {
    ...v,
    badges: readBadges(fd),
    participated: years as number[],
    photo_media_id: media.id,
  };

  if (id) {
    const { error } = await supabase.from("members").update(row).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
    if (oldPhoto && oldPhoto !== media.id) await cleanupMedia(supabase, [oldPhoto]);
    revalidateSite();
    return ok();
  }
  const sort_order = await nextSortOrder(supabase, "members");
  const { data, error } = await supabase.from("members").insert({ ...row, sort_order }).select("id").single();
  if (error) return { error: `Couldn't create the member: ${error.message}` };
  revalidateSite();
  redirect(withNotice(`/admin/members/${data.id}`, `Created '${v.name}'.`));
}

export async function setMemberPublished(id: string, published: boolean): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("members").update({ published }).eq("id", id);
  revalidateSite();
}

export async function moveMember(id: string, dir: "up" | "down"): Promise<void> {
  const { supabase } = await editorSession();
  await moveInOrder(supabase, "members", id, dir);
  revalidateSite();
}

export async function deleteMember(id: string): Promise<void> {
  const { supabase } = await editorSession();
  const { data } = await supabase.from("members").select("name, photo_media_id").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/members");
  const { error } = await supabase.from("members").delete().eq("id", id);
  if (error) redirect(withNotice(`/admin/members/${id}`, `Couldn't delete: ${error.message}`));
  await cleanupMedia(supabase, [data.photo_media_id]);
  revalidateSite();
  redirect(withNotice("/admin/members", `Deleted '${data.name}'.`));
}
