import type { Metadata } from "next";

import { ContentList, type ContentRow } from "@/components/admin/content-list";
import { deleteLink, moveLink, setLinkPublished } from "@/lib/actions/links";
import { editorPage } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Links" };

function host(url: string): string {
  if (url.startsWith("mailto:")) return url.slice(7);
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function LinksAdmin({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const me = await editorPage("/admin/links");
  if (!me) return null;
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from("links").select("id, label, url, icon, published").order("sort_order").order("created_at");
  if (error) throw new Error(error.message);

  const rows: ContentRow[] = data.map((l) => ({
    id: l.id,
    title: l.label,
    href: `/admin/links/${l.id}`,
    meta: host(l.url),
    thumb: null,
    thumbName: l.label,
    published: l.published,
    search: `${l.label} ${l.url}`.toLowerCase(),
    siteHref: "/links",
    deleteNote: "Removes this link from /links.",
  }));

  return (
    <ContentList
      noun="link"
      title="Links"
      plural="links"
      purpose="The /links page: the link-in-bio list people reach from Instagram and Discord."
      newHref="/admin/links/new"
      rows={rows}
      notice={notice}
      orderable
      moveAction={moveLink}
      publishAction={setLinkPublished}
      deleteAction={deleteLink}
    />
  );
}
