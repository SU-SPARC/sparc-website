"use server";

/* Project requests: any signed-in member proposes a project; the requester
 * may edit or withdraw it while it is still proposed; an editor approves it
 * (which builds the board from the methodology template inside the
 * approve_project_request RPC) or declines it with a reason.
 *
 * Authorisation is RLS + the RPCs' own is_editor() check; requireUser() /
 * requireEditor() first is the UX guard. */

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireEditor, requireUser } from "@/lib/auth";
import { CLUB_TZ } from "@/lib/data/dates";
import { createClient } from "@/lib/supabase/server";

import { slugifyTitle } from "./content-helpers";
import { withNotice, zodFail, zOptText, zOptUrl, zText } from "./form-data";
import type { FormState } from "./form-state";

const GITHUB = /^https:\/\/github\.com\/[^/\s]+(\/[^/\s]+)?\/?$/;

const RequestShape = z.object({
  title: zText("a title", 120),
  summary: zText("a one-line summary", 140),
  description: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().max(300, { error: "Keep each line under 300 characters." })).max(12, { error: "Keep it to 12 lines or fewer." })),
  kind: z.enum(["team", "personal"], { error: "Pick team or personal." }),
  methodology: z.enum(["kanban", "scrumban", "scrum", "safe"], { error: "Pick a methodology." }),
  supervisor_kind: z.enum(["faculty", "student"], { error: "Pick faculty or student." }),
  supervisor_member_id: zOptText,
  supervisor_name: zOptText.pipe(z.string().max(120).nullable()),
  repo_url: zOptUrl.pipe(
    z.string().regex(GITHUB, { error: "Use a GitHub link like https://github.com/SU-SPARC/repo." }).nullable(),
  ),
});

function supervisorFields(v: z.infer<typeof RequestShape>) {
  if (v.supervisor_kind === "faculty") {
    return { supervisor_kind: "faculty" as const, supervisor_member_id: null, supervisor_name: v.supervisor_name };
  }
  return {
    supervisor_kind: "student" as const,
    supervisor_member_id: v.supervisor_member_id,
    supervisor_name: v.supervisor_member_id ? null : v.supervisor_name,
  };
}

function supervisorErrors(v: z.infer<typeof RequestShape>): Record<string, string[]> {
  if (v.supervisor_kind === "faculty" && !v.supervisor_name) return { supervisor_name: ["Enter the supervisor's name."] };
  if (v.supervisor_kind === "student" && !v.supervisor_member_id && !v.supervisor_name) {
    return { supervisor_member_id: ["Pick a member or type a name."] };
  }
  return {};
}

/** "Fall 2026" for today in America/New_York. */
function currentTerm(): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: CLUB_TZ, year: "numeric", month: "numeric" }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const season = month <= 5 ? "Spring" : month <= 7 ? "Summer" : "Fall";
  return `${season} ${year}`;
}

function revalidateRequests() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath("/admin", "layout");
}

const denied = (code?: string) =>
  code === "42501" ? "You can't change this request." : null;

/** Any signed-in account. Inserts a proposed, unpublished project with a
 *  temporary REQ-xxxxxx ref, then → /dashboard with a banner. */
export async function requestProject(_prev: FormState, fd: FormData): Promise<FormState> {
  const current = await requireUser("/dashboard/projects/new");
  const parsed = RequestShape.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const sup = supervisorErrors(v);
  if (Object.keys(sup).length) return { fieldErrors: sup };

  const supabase = await createClient();
  const base = slugifyTitle(v.title) || "project";
  const { data: clash } = await supabase.from("projects").select("id").eq("slug", base).limit(1);
  const slug = clash?.length ? `${base}-${randomBytes(2).toString("hex")}` : base;

  const { error } = await supabase.from("projects").insert({
    ref: `REQ-${randomBytes(3).toString("hex").toUpperCase()}`,
    slug,
    title: v.title,
    summary: v.summary,
    highlights: v.description,
    kind: v.kind,
    methodology: v.methodology,
    ...supervisorFields(v),
    repo_url: v.repo_url,
    term: currentTerm(),
    status: "proposed",
    published: false,
    requested_by: current.user.id,
  });
  if (error) return { error: denied(error.code) ?? `Couldn't send the request: ${error.message}` };

  revalidateRequests();
  redirect(withNotice("/dashboard", "Request sent. It shows under My requests until the e-board reviews it."));
}

/** The requester edits their request while it is still proposed. */
export async function updateRequest(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/projects");
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { error: "Missing request id." };
  const parsed = RequestShape.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;
  const sup = supervisorErrors(v);
  if (Object.keys(sup).length) return { fieldErrors: sup };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({
      title: v.title,
      summary: v.summary,
      highlights: v.description,
      methodology: v.methodology,
      ...supervisorFields(v),
      repo_url: v.repo_url,
    })
    .eq("id", id.data)
    .eq("status", "proposed")
    .select("id");
  if (error) return { error: denied(error.code) ?? `Couldn't save: ${error.message}` };
  if (!data.length) return { error: "This request was already reviewed, or isn't yours." };

  revalidateRequests();
  redirect(withNotice("/dashboard", `Saved your request '${v.title}'.`));
}

/** Delete my own request while it is still proposed. */
export async function withdrawRequest(id: string): Promise<{ error?: string }> {
  await requireUser("/dashboard");
  if (!z.uuid().safeParse(id).success) return { error: "Missing request id." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("status", "proposed")
    .select("title");
  if (error) return { error: denied(error.code) ?? `Couldn't withdraw: ${error.message}` };
  if (!data.length) return { error: "This request was already reviewed, or isn't yours." };
  revalidateRequests();
  redirect(withNotice("/dashboard", `Withdrew '${data[0].title}'.`));
}

const ApproveShape = z.object({
  id: z.uuid(),
  ref: z
    .string()
    .transform((v) => v.trim().toUpperCase().replace(/^SP-/, ""))
    .pipe(z.string().regex(/^\d{1,4}$/, { error: "Use digits, e.g. 014." })),
  methodology: z.enum(["kanban", "scrumban", "scrum", "safe"], { error: "Pick a methodology." }),
  supervisorKind: z.enum(["faculty", "student"], { error: "Pick faculty or student." }),
  supervisorMemberId: z.string().optional().transform((v) => (v ? v : null)),
  supervisorName: z.string().optional().transform((v) => (v ?? "").trim() || null),
});

export type ApproveInput = z.input<typeof ApproveShape>;
export type ReviewResult = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> };

/** Editors: approve, which creates the board from the template. */
export async function approveRequest(input: ApproveInput): Promise<ReviewResult> {
  await requireEditor("/admin/projects/requests");
  const parsed = ApproveShape.safeParse(input);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }
  const v = parsed.data;
  if (v.supervisorKind === "faculty" && !v.supervisorName) return { fieldErrors: { supervisorName: ["Enter the supervisor's name."] } };
  if (v.supervisorKind === "student" && !v.supervisorMemberId && !v.supervisorName) {
    return { fieldErrors: { supervisorMemberId: ["Pick a member or type a name."] } };
  }
  const ref = `SP-${v.ref.padStart(3, "0")}`;
  const supabase = await createClient();
  const { data: taken } = await supabase.from("projects").select("title").eq("ref", ref).neq("id", v.id).limit(1);
  if (taken?.length) return { fieldErrors: { ref: [`${ref} is taken by '${taken[0].title}'.`] } };

  const { error } = await supabase.rpc("approve_project_request", {
    p: v.id,
    ref,
    methodology: v.methodology,
    supervisor_kind: v.supervisorKind,
    // The generated types mark RPC args non-null; SQL accepts null here.
    supervisor_member_id: (v.supervisorKind === "student" ? v.supervisorMemberId : null) as string,
    supervisor_name: (v.supervisorKind === "student" && v.supervisorMemberId ? null : v.supervisorName) as string,
  });
  if (error) {
    if (error.code === "23505") return { fieldErrors: { ref: [`${ref} is already used.`] } };
    if (error.code === "42501") return { error: "Only e-board editors can approve requests." };
    if (error.code === "P0002") return { error: "This request was already reviewed." };
    return { error: `Couldn't approve: ${error.message}` };
  }
  revalidateRequests();
  revalidatePath(`/dashboard/projects/${v.id}`);
  return { ok: true };
}

/** Editors: decline with a reason the requester will see. */
export async function declineRequest(input: { id: string; reason: string }): Promise<ReviewResult> {
  await requireEditor("/admin/projects/requests");
  if (!z.uuid().safeParse(input.id).success) return { error: "Missing request id." };
  const reason = (input.reason ?? "").trim();
  if (reason.length > 500) return { fieldErrors: { reason: ["Keep it under 500 characters."] } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_project_request", { p: input.id, reason });
  if (error) {
    if (error.code === "42501") return { error: "Only e-board editors can decline requests." };
    if (error.code === "P0002") return { error: "This request was already reviewed." };
    return { error: `Couldn't decline: ${error.message}` };
  }
  revalidateRequests();
  return { ok: true };
}
