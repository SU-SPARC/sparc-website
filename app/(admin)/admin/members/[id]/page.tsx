import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DangerZone } from "@/components/admin/edit-client";
import { EditHeader } from "@/components/admin/edit-layout";
import { MemberForm } from "@/components/admin/forms/member-form";
import { StatusBanner } from "@/components/forms/status-banner";
import { deleteMember } from "@/lib/actions/members";
import { editorPage, MEDIA_COLS, toExistingImage, type MediaCols } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit member" };

function participationYears(extra: number[]): number[] {
  const now = new Date().getFullYear();
  return [...new Set([2025, now - 1, now, now + 1, ...extra])].filter((y) => y >= 2025).sort();
}

export default async function EditMember({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const me = await editorPage(`/admin/members/${id}`);
  if (!me) return null;
  const supabase = await createClient();
  const [{ data: m }, { data: account }] = await Promise.all([
    supabase.from("members").select(`*, photo:media!members_photo_media_id_fkey(${MEDIA_COLS})`).eq("id", id).maybeSingle(),
    supabase.from("people").select("display_name").eq("member_id", id).maybeSingle(),
  ]);
  if (!m) notFound();

  return (
    <>
      {notice ? <StatusBanner clearParam="notice" className="mb-6">{notice}</StatusBanner> : null}
      <EditHeader section="Members" sectionHref="/admin/members" title={m.name} siteHref={m.published ? "/about" : null} />
      <MemberForm
        years={participationYears(m.participated.filter((y) => y >= 2025))}
        d={{
          id: m.id,
          name: m.name,
          slug: m.slug,
          nickname: m.nickname ?? "",
          class_year: String(m.class_year),
          status: m.status,
          role: m.role ?? "",
          role_term: m.role_term ?? "",
          role_history: m.role_history,
          badges: m.badges,
          participated: m.participated,
          bio: m.bio ?? "",
          linkedin: m.linkedin ?? "",
          website: m.website ?? "",
          eboard: m.eboard,
          published: m.published,
          photo: toExistingImage(m.photo as MediaCols | null),
          created_at: m.created_at,
          updated_at: m.updated_at,
          linkedAccount: account ? (account.display_name ?? "an account") : null,
        }}
      />
      <DangerZone
        noun="member"
        itemName={m.name}
        description="Removes this card from /about and deletes its photo. A linked account stays but loses its card."
        deleteAction={deleteMember.bind(null, m.id)}
      />
    </>
  );
}
