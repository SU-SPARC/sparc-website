import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DangerZone } from "@/components/admin/edit-client";
import { EditHeader } from "@/components/admin/edit-layout";
import { NewsForm } from "@/components/admin/forms/news-form";
import { StatusBanner } from "@/components/forms/status-banner";
import { deleteNews } from "@/lib/actions/news";
import { editorPage, MEDIA_COLS, toExistingImage, type MediaCols } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit news" };

export default async function EditNews({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const me = await editorPage(`/admin/news/${id}`);
  if (!me) return null;
  const supabase = await createClient();
  const { data: n } = await supabase
    .from("news")
    .select(`*, image:media!news_media_id_fkey(${MEDIA_COLS})`)
    .eq("id", id)
    .maybeSingle();
  if (!n) notFound();

  return (
    <>
      {notice ? <StatusBanner clearParam="notice" className="mb-6">{notice}</StatusBanner> : null}
      <EditHeader section="News" sectionHref="/admin/news" title={n.title} siteHref={n.published ? "/" : null} />
      <NewsForm
        d={{
          id: n.id,
          slug: n.slug,
          title: n.title,
          published_on: n.published_on,
          published: n.published,
          image: toExistingImage(n.image as MediaCols | null),
          created_at: n.created_at,
          updated_at: n.updated_at,
        }}
      />
      <DangerZone noun="news item" itemName={n.title} description="Removes this news card from the home page." deleteAction={deleteNews.bind(null, n.id)} />
    </>
  );
}
