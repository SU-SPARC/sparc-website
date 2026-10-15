import type { Metadata } from "next";

import { ContentList, type ContentRow } from "@/components/admin/content-list";
import { deleteNews, setNewsPublished } from "@/lib/actions/news";
import { editorPage } from "@/lib/actions/queries";
import { formatDateOnly } from "@/lib/data/dates";
import { createClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";

export const metadata: Metadata = { title: "News" };

export default async function NewsAdmin({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const me = await editorPage("/admin/news");
  if (!me) return null;
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news")
    .select("id, slug, title, published_on, published, image:media!news_media_id_fkey(path, thumb_path)")
    .order("published_on", { ascending: false });
  if (error) throw new Error(error.message);

  const rows: ContentRow[] = data.map((n) => ({
    id: n.id,
    title: n.title,
    href: `/admin/news/${n.id}`,
    meta: formatDateOnly(n.published_on),
    thumb: n.image ? publicUrl(n.image.thumb_path ?? n.image.path) : null,
    published: n.published,
    search: `${n.title} ${n.slug}`.toLowerCase(),
    siteHref: "/",
    deleteNote: "Removes this news card from the home page.",
  }));

  return (
    <ContentList
      noun="news item"
      title="News"
      plural="news items"
      purpose="Short cards on the home page. Each one links to /events."
      newHref="/admin/news/new"
      rows={rows}
      notice={notice}
      publishAction={setNewsPublished}
      deleteAction={deleteNews}
    />
  );
}
