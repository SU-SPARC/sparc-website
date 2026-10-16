"use client";

import { EditColumns, FormSection, RecordCard } from "@/components/admin/edit-layout";
import { PublishCard } from "@/components/admin/edit-client";
import { EditForm } from "@/components/forms/edit-form";
import { Field } from "@/components/forms/field";
import { ImageUpload, type ExistingImage } from "@/components/forms/image-upload";
import { Input } from "@/components/forms/input";
import { Switch } from "@/components/forms/switch";
import { savePhoto } from "@/lib/actions/photos";

export type PhotoDefaults = {
  id: string | null;
  caption: string;
  taken_on: string;
  featured: boolean;
  published: boolean;
  image: ExistingImage | null;
  created_at: string | null;
  updated_at: string | null;
};

export function PhotoForm({ d }: { d: PhotoDefaults }) {
  const isNew = d.id === null;
  return (
    <EditForm action={savePhoto} itemName={d.caption || "this photo"} hidden={d.id ? { id: d.id } : undefined} isNew={isNew} saveLabel={isNew ? "Add photo" : "Save"}>
      <EditColumns
        rail={
          <>
            <PublishCard defaultPublished={d.published} helperOn="In the home gallery">
              <Switch
                name="featured"
                label="Featured"
                defaultChecked={d.featured}
                helperOn="The first featured photo is the About page photo"
                helperOff="Gallery only"
              />
            </PublishCard>
            <RecordCard createdAt={d.created_at} updatedAt={d.updated_at} />
          </>
        }
      >
        <FormSection title="Photo">
          <ImageUpload name="image" label="Image" kind="photos" aspect="photo" initial={d.image} />
        </FormSection>
        <FormSection title="Details">
          <Field label="Caption" name="caption" optional>
            <Input name="caption" defaultValue={d.caption} />
          </Field>
          <Field label="Taken on" name="taken_on" optional>
            <Input name="taken_on" type="date" defaultValue={d.taken_on} />
          </Field>
        </FormSection>
      </EditColumns>
    </EditForm>
  );
}
