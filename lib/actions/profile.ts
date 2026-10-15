"use server";

/* Own-profile actions: display name + own member card (one form), and a
 * password change. Everything runs on the user's session; RLS lets a
 * linked member update only nickname, photo, bio, linkedin and website on
 * their own card (a trigger rejects anything else). */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isEditorRole, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { ok, zodFail, zOptText, zOptUrl } from "./form-data";
import type { FormState } from "./form-state";
import { cleanupMedia, imageFieldError, readImageField, resolveImageField } from "./media-helpers";

const Profile = z.object({
  display_name: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, { error: "Enter the name people see." }).max(80, { error: "Keep it under 80 characters." })),
});

const Card = z.object({
  nickname: zOptText.pipe(z.string().max(40, { error: "Keep it under 40 characters." }).nullable()),
  bio: zOptText.pipe(z.string().max(600, { error: "Keep it under 600 characters." }).nullable()),
  linkedin: zOptUrl,
  website: zOptUrl,
});

export async function saveProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = await requireUser("/dashboard/profile");
  const supabase = await createClient();
  const isEditor = isEditorRole(current.profile.role);
  const memberId = current.profile.member_id;

  const profile = Profile.safeParse({ display_name: formData.get("display_name") ?? "" });
  const card = memberId
    ? Card.safeParse({
        nickname: formData.get("nickname") ?? "",
        bio: formData.get("bio") ?? "",
        linkedin: formData.get("linkedin") ?? "",
        website: formData.get("website") ?? "",
      })
    : null;
  const photo = memberId ? readImageField(formData, "photo") : undefined;
  const photoError = memberId ? imageFieldError(photo, false) : undefined;

  if (!profile.success || (card && !card.success) || photoError) {
    const fe = {
      ...(profile.success ? {} : z.flattenError(profile.error).fieldErrors),
      ...(card && !card.success ? z.flattenError(card.error).fieldErrors : {}),
      ...(photoError ? { photo: [photoError] } : {}),
    };
    return { fieldErrors: fe };
  }

  const { error: nameError } = await supabase
    .from("profiles")
    .update({ display_name: profile.data.display_name })
    .eq("id", current.user.id);
  if (nameError) return { error: `Couldn't save your name: ${nameError.message}` };

  if (memberId && card?.success && photo !== undefined && photo !== "invalid") {
    // Old photo, read on the server (never trust the form for it).
    const admin = createAdminClient();
    const { data: before } = await admin.from("members").select("photo_media_id").eq("id", memberId).maybeSingle();
    const oldPhotoId = before?.photo_media_id ?? null;

    // Alt text on the existing photo: editors may update media; a member
    // may change only their own card's current photo (checked here).
    if (photo && "id" in photo && !isEditor) {
      if (photo.id !== oldPhotoId) return { fieldErrors: { photo: ["That image isn't your card's photo."] } };
      const { error } = await admin.from("media").update({ alt: photo.alt.trim() }).eq("id", photo.id);
      if (error) return { error: `Couldn't update the alt text: ${error.message}` };
    }
    const resolved = await resolveImageField(supabase, photo, "members", { updateExistingAlt: isEditor });
    if ("error" in resolved) return { fieldErrors: { photo: [resolved.error] } };

    const patch = { ...card.data, photo_media_id: resolved.id };
    const { data: updated, error } = await supabase.from("members").update(patch).eq("id", memberId).select("id");
    if (error) return { error: `Couldn't save your card: ${error.message}` };
    if (!updated?.length) {
      // RLS hides unpublished cards from members, so an UPDATE on one's own
      // hidden card matches no rows. The caller's own member_id came from
      // their profile and `patch` holds only the five self-editable
      // columns, so do the same write with the admin client.
      const { error: adminError } = await admin.from("members").update(patch).eq("id", memberId);
      if (adminError) return { error: `Couldn't save your card: ${adminError.message}` };
    }
    if (oldPhotoId && oldPhotoId !== resolved.id) {
      // Members can't delete media or objects; the admin client does it
      // for the card's own previous photo only.
      await cleanupMedia(isEditor ? supabase : admin, [oldPhotoId]);
    }
  }

  revalidatePath("/", "layout");
  return ok();
}

const Password = z
  .object({
    password: z.string().min(8, { error: "At least 8 characters." }),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { error: "The two passwords don't match.", path: ["confirm"] });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("/dashboard/profile");
  const parsed = Password.safeParse({
    password: formData.get("password") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) return zodFail(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: ["Choose a password different from your current one."] } };
    }
    return { error: error.message };
  }
  return ok();
}
