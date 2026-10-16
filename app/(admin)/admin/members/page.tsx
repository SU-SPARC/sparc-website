import type { Metadata } from "next";

import { ContentList, type ContentRow } from "@/components/admin/content-list";
import { deleteMember, moveMember, setMemberPublished } from "@/lib/actions/members";
import { editorPage } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";

export const metadata: Metadata = { title: "Members" };

export default async function MembersAdmin({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const me = await editorPage("/admin/members");
  if (!me) return null;
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, name, slug, role, class_year, status, eboard, published, photo:media!members_photo_media_id_fkey(path, thumb_path)")
    .order("sort_order")
    .order("name");
  if (error) throw new Error(error.message);

  const rows: ContentRow[] = data.map((m) => ({
    id: m.id,
    title: m.name,
    href: `/admin/members/${m.id}`,
    meta: [m.role ?? "Member", `Class of ${m.class_year}`, m.status === "alumni" ? "Alumni" : null].filter(Boolean).join(" · "),
    thumb: m.photo ? publicUrl(m.photo.thumb_path ?? m.photo.path) : null,
    thumbName: m.name,
    published: m.published,
    tags: [m.status, ...(m.eboard ? ["eboard"] : [])],
    search: `${m.name} ${m.slug} ${m.role ?? ""} ${m.class_year}`.toLowerCase(),
    siteHref: "/about",
    deleteNote: "Removes this card from /about. A linked account stays but loses its card.",
  }));

  return (
    <ContentList
      noun="member"
      title="Members"
      plural="members"
      purpose="The people cards on /about, in this order."
      newHref="/admin/members/new"
      rows={rows}
      extraFilters={[
        { key: "current", label: "Current" },
        { key: "alumni", label: "Alumni" },
        { key: "eboard", label: "E-board" },
      ]}
      notice={notice}
      orderable
      moveAction={moveMember}
      publishAction={setMemberPublished}
      deleteAction={deleteMember}
      titleColumn="Member"
    />
  );
}
