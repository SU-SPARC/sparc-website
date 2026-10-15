import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DangerZone } from "@/components/admin/edit-client";
import { EditHeader } from "@/components/admin/edit-layout";
import { PhotoForm } from "@/components/admin/forms/photo-form";
import { StatusBanner } from "@/components/forms/status-banner";
import { deletePhoto } from "@/lib/actions/photos";
import { editorPage, MEDIA_COLS, toExistingImage, type MediaCols } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit photo" };

export default async function EditPhoto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const me = await editorPage(`/admin/photos/${id}`);
  if (!me) return null;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("photos")
    .select(`*, image:media!photos_media_id_fkey(${MEDIA_COLS})`)
    .eq("id", id)
    .maybeSingle();
  if (!p) notFound();
  const image = p.image as MediaCols | null;
  const title = p.caption || image?.alt || "Photo";

  return (
    <>
      {notice ? <StatusBanner clearParam="notice" className="mb-6">{notice}</StatusBanner> : null}
      <EditHeader section="Photos" sectionHref="/admin/photos" title={title} siteHref={p.published ? "/" : null} />
      <PhotoForm
        d={{
          id: p.id,
          caption: p.caption ?? "",
          taken_on: p.taken_on ?? "",
          featured: p.featured,
          published: p.published,
          image: toExistingImage(image),
          created_at: p.created_at,
          updated_at: p.updated_at,
        }}
      />
      <DangerZone noun="photo" itemName={title} description="Removes this photo from the home gallery and deletes the image file." deleteAction={deletePhoto.bind(null, p.id)} />
    </>
  );
}
