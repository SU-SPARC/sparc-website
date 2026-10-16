import type { Metadata } from "next";

import { EditHeader } from "@/components/admin/edit-layout";
import { PhotoForm } from "@/components/admin/forms/photo-form";
import { editorPage } from "@/lib/actions/queries";

export const metadata: Metadata = { title: "New photo" };

export default async function NewPhoto() {
  const me = await editorPage("/admin/photos/new");
  if (!me) return null;
  return (
    <>
      <EditHeader section="Photos" sectionHref="/admin/photos" title="New photo" />
      <PhotoForm d={{ id: null, caption: "", taken_on: "", featured: false, published: true, image: null, created_at: null, updated_at: null }} />
    </>
  );
}
