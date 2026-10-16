import type { Metadata } from "next";

import { ContentList, type ContentRow } from "@/components/admin/content-list";
import { deletePhoto, movePhoto, setPhotoPublished } from "@/lib/actions/photos";
import { editorPage } from "@/lib/actions/queries";
import { formatDateOnly } from "@/lib/data/dates";
import { createClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";

export const metadata: Metadata = { title: "Photos" };

export default async function PhotosAdmin({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const me = await editorPage("/admin/photos");
  if (!me) return null;
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("id, caption, taken_on, featured, published, image:media!photos_media_id_fkey(path, thumb_path, alt, original_name, bytes)")
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(error.message);

  const rows: ContentRow[] = data.map((p, i) => {
    const title = p.caption || p.image?.alt || p.image?.original_name || `Photo ${i + 1}`;
    return {
      id: p.id,
      title,
      href: `/admin/photos/${p.id}`,
      meta: [p.taken_on ? formatDateOnly(p.taken_on) : null, p.featured ? "Featured on /about" : null]
        .filter(Boolean)
        .join(" · ") || "No date",
      thumb: p.image ? publicUrl(p.image.thumb_path ?? p.image.path) : null,
      published: p.published,
      tags: p.featured ? ["featured"] : [],
      search: `${title} ${p.image?.alt ?? ""}`.toLowerCase(),
      siteHref: "/",
      deleteNote: "Removes this photo from the home gallery and deletes the image file.",
    };
  });

  return (
    <ContentList
      noun="photo"
      title="Photos"
      plural="photos"
      purpose="The gallery the home photo strip draws from. The first featured photo is the About page photo."
      newHref="/admin/photos/new"
      rows={rows}
      extraFilters={[{ key: "featured", label: "Featured" }]}
      notice={notice}
      orderable
      moveAction={movePhoto}
      publishAction={setPhotoPublished}
      deleteAction={deletePhoto}
      titleColumn="Photo"
    />
  );
}
