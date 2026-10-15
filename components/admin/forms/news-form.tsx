"use client";

import { EditColumns, FormSection, RecordCard } from "@/components/admin/edit-layout";
import { PublishCard, TitleSlugFields } from "@/components/admin/edit-client";
import { EditForm } from "@/components/forms/edit-form";
import { Field } from "@/components/forms/field";
import { ImageUpload, type ExistingImage } from "@/components/forms/image-upload";
import { Input } from "@/components/forms/input";
import { saveNews } from "@/lib/actions/news";

export type NewsDefaults = {
  id: string | null;
  slug: string;
  title: string;
  published_on: string;
  published: boolean;
  image: ExistingImage | null;
  created_at: string | null;
  updated_at: string | null;
};

export function NewsForm({ d }: { d: NewsDefaults }) {
  const isNew = d.id === null;
  return (
    <EditForm action={saveNews} itemName={d.title || "this news item"} hidden={d.id ? { id: d.id } : undefined} isNew={isNew}>
      <EditColumns
        rail={
          <>
            <PublishCard defaultPublished={d.published} helperOn="Shown on the home page" />
            <RecordCard createdAt={d.created_at} updatedAt={d.updated_at} />
          </>
        }
      >
        <FormSection title="Basics">
          <TitleSlugFields defaultTitle={d.title} defaultSlug={d.slug} isNew={isNew} slugPrefix="/news/" slugHelper="An id for this card. There is no news page; cards link to /events." />
          <Field label="Date" name="published_on">
            <Input name="published_on" type="date" defaultValue={d.published_on} />
          </Field>
        </FormSection>
        <FormSection title="Media">
          <ImageUpload name="image" label="Image" kind="news" aspect="wide" initial={d.image} slug={d.slug || undefined} />
        </FormSection>
      </EditColumns>
    </EditForm>
  );
}
