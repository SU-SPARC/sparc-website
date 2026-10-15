"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { EditColumns, FormSection, RecordCard } from "@/components/admin/edit-layout";
import { PublishCard } from "@/components/admin/edit-client";
import { EditForm } from "@/components/forms/edit-form";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/forms/input";
import { saveLink } from "@/lib/actions/links";

const IconPreview = dynamic(() => import("./icon-preview"), {
  ssr: false,
  loading: () => <span className="block h-10" />,
});

export type LinkDefaults = {
  id: string | null;
  label: string;
  url: string;
  description: string;
  icon: string;
  published: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export function LinkForm({ d }: { d: LinkDefaults }) {
  const isNew = d.id === null;
  const [icon, setIcon] = React.useState(d.icon);
  return (
    <EditForm action={saveLink} itemName={d.label || "this link"} hidden={d.id ? { id: d.id } : undefined} isNew={isNew}>
      <EditColumns
        rail={
          <>
            <PublishCard defaultPublished={d.published} helperOn="Listed on /links" />
            <RecordCard createdAt={d.created_at} updatedAt={d.updated_at} />
          </>
        }
      >
        <FormSection title="Link">
          <Field label="Label" name="label">
            <Input name="label" defaultValue={d.label} />
          </Field>
          <Field label="URL" name="url" helper="https://… or mailto:…">
            <Input name="url" type="url" inputMode="url" placeholder="https://" defaultValue={d.url} />
          </Field>
          <Field label="Description" name="description" optional helper="One short line under the label.">
            <Input name="description" defaultValue={d.description} />
          </Field>
          <Field label="Icon" name="icon" optional helper="A lucide icon name in kebab-case, e.g. message-circle, github, mail. See lucide.dev/icons.">
            <Input name="icon" mono value={icon} onChange={(e) => setIcon(e.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
          <IconPreview name={icon} />
        </FormSection>
      </EditColumns>
    </EditForm>
  );
}
