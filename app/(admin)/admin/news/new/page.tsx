import type { Metadata } from "next";

import { EditHeader } from "@/components/admin/edit-layout";
import { NewsForm } from "@/components/admin/forms/news-form";
import { editorPage } from "@/lib/actions/queries";
import { isoDateOnly } from "@/lib/data/dates";

export const metadata: Metadata = { title: "New news item" };

export default async function NewNews() {
  const me = await editorPage("/admin/news/new");
  if (!me) return null;
  return (
    <>
      <EditHeader section="News" sectionHref="/admin/news" title="New news item" />
      <NewsForm
        d={{ id: null, slug: "", title: "", published_on: isoDateOnly(new Date()), published: true, image: null, created_at: null, updated_at: null }}
      />
    </>
  );
}
