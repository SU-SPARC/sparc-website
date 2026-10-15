"use client";

import { EditColumns, FormSection, RecordCard } from "@/components/admin/edit-layout";
import { PublishCard, RefField, TitleSlugFields } from "@/components/admin/edit-client";
import { EditForm } from "@/components/forms/edit-form";
import { Field } from "@/components/forms/field";
import { ImageUpload, type ExistingImage } from "@/components/forms/image-upload";
import { Input, Textarea } from "@/components/forms/input";
import { saveEvent } from "@/lib/actions/events";

export type EventDefaults = {
  id: string | null;
  ref: string;
  slug: string;
  title: string;
  kind: string;
  date: string;
  time: string;
  location: string;
  description: string;
  recording_url: string;
  published: boolean;
  cover: ExistingImage | null;
  created_at: string | null;
  updated_at: string | null;
};

export function EventForm({ d, proposedRef }: { d: EventDefaults; proposedRef: string }) {
  const isNew = d.id === null;
  return (
    <EditForm action={saveEvent} itemName={d.title || "this event"} hidden={d.id ? { id: d.id } : undefined} isNew={isNew}>
      <EditColumns
        rail={
          <>
            <PublishCard defaultPublished={d.published} />
            <RecordCard createdAt={d.created_at} updatedAt={d.updated_at} />
          </>
        }
      >
        <FormSection title="Basics">
          <TitleSlugFields defaultTitle={d.title} defaultSlug={d.slug} isNew={isNew} />
          <div className="grid gap-5 sm:grid-cols-2">
            <RefField prefix="#" defaultValue={d.ref} proposed={proposedRef} isNew={isNew} />
            <Field label="Kind" name="kind" helper="Development, Panel or Guest.">
              <Input name="kind" list="event-kinds" defaultValue={d.kind} />
            </Field>
            <datalist id="event-kinds">
              <option value="Development" />
              <option value="Panel" />
              <option value="Guest" />
            </datalist>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Date" name="date">
              <Input name="date" type="date" defaultValue={d.date} />
            </Field>
            <Field label="Time" name="time" optional helper="Boston time.">
              <Input name="time" type="time" defaultValue={d.time} />
            </Field>
          </div>
        </FormSection>
        <FormSection title="Details">
          <Field label="Room" name="location" optional>
            <Input name="location" defaultValue={d.location} />
          </Field>
          <Field label="Description" name="description" optional>
            <Textarea name="description" rows={5} defaultValue={d.description} />
          </Field>
          <Field label="Recording link" name="recording_url" optional helper="A single link shown on the event row. Zoom recordings go in the list below.">
            <Input name="recording_url" type="url" inputMode="url" placeholder="https://" defaultValue={d.recording_url} />
          </Field>
        </FormSection>
        <FormSection title="Media">
          <ImageUpload name="cover" label="Cover image" kind="events" aspect="wide" initial={d.cover} slug={d.slug || undefined} optional />
        </FormSection>
      </EditColumns>
    </EditForm>
  );
}
