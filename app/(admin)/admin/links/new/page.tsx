import type { Metadata } from "next";

import { EditHeader } from "@/components/admin/edit-layout";
import { LinkForm } from "@/components/admin/forms/link-form";
import { editorPage } from "@/lib/actions/queries";

export const metadata: Metadata = { title: "New link" };

export default async function NewLink() {
  const me = await editorPage("/admin/links/new");
  if (!me) return null;
  return (
    <>
      <EditHeader section="Links" sectionHref="/admin/links" title="New link" />
      <LinkForm d={{ id: null, label: "", url: "", description: "", icon: "", published: true, created_at: null, updated_at: null }} />
    </>
  );
}
