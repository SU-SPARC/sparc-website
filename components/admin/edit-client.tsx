"use client";

/* Client pieces of the admin edit page: the Publish card, the Delete
 * section, and the ref/slug fields with "next free" proposals. */

import * as React from "react";

import { Button } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/forms/input";
import { Switch } from "@/components/forms/switch";
import { MicroLabel } from "@/components/ui/micro-label";

import { RailCard } from "./edit-layout";

export function PublishCard({
  defaultPublished,
  helperOn = "Visible on the site",
  helperOff = "Only editors can see this",
  children,
}: {
  defaultPublished: boolean;
  helperOn?: string;
  helperOff?: string;
  children?: React.ReactNode;
}) {
  return (
    <RailCard title="Status">
      <Switch name="published" label="Published" defaultChecked={defaultPublished} helperOn={helperOn} helperOff={helperOff} />
      {children}
    </RailCard>
  );
}

export function DangerZone({
  noun,
  itemName,
  description,
  deleteAction,
  confirmText,
}: {
  noun: string;
  itemName: string;
  description: React.ReactNode;
  deleteAction: () => Promise<void>;
  confirmText?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <section className="mt-10 flex max-w-text flex-col gap-3 rounded-card border border-danger bg-surface-1 p-4">
      <MicroLabel as="h2">Delete</MicroLabel>
      <p className="text-sm text-ink-muted">{description}</p>
      <div>
        <Button variant="danger-outline" onClick={() => setOpen(true)}>
          Delete {noun}…
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${itemName}?`}
        confirmLabel={`Delete ${noun}`}
        pendingLabel="Deleting…"
        confirmText={confirmText}
        onConfirm={deleteAction}
      >
        <p>{description} This can't be undone.</p>
      </ConfirmDialog>
    </section>
  );
}

/** Ref field with a fixed prefix ("SP-", "#"). New items arrive with the
 *  next free value; existing ones warn on focus that changing breaks links. */
export function RefField({
  name = "ref",
  label = "Ref",
  prefix,
  defaultValue,
  proposed,
  isNew,
}: {
  name?: string;
  label?: string;
  prefix: string;
  defaultValue: string;
  proposed: string;
  isNew: boolean;
}) {
  const [focused, setFocused] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  const helper = isNew
    ? `Next free: ${prefix}${proposed}. Shown on the site as ${prefix}${value || proposed}.`
    : focused
      ? "Changing this breaks old links."
      : `Shown on the site as ${prefix}${value}.`;
  return (
    <Field label={label} name={name} helper={helper}>
      <Input
        name={name}
        prefix={prefix}
        mono
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete="off"
        spellCheck={false}
      />
    </Field>
  );
}

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Title + slug pair. On new items the slug follows the title until the
 *  editor types in the slug field. */
export function TitleSlugFields({
  titleLabel = "Title",
  titleName = "title",
  defaultTitle,
  defaultSlug,
  isNew,
  slugPrefix,
  slugHelper,
}: {
  titleLabel?: string;
  titleName?: string;
  defaultTitle: string;
  defaultSlug: string;
  isNew: boolean;
  slugPrefix?: string;
  slugHelper?: string;
}) {
  const [title, setTitle] = React.useState(defaultTitle);
  const [slug, setSlug] = React.useState(defaultSlug);
  const [touched, setTouched] = React.useState(!isNew);
  const [focused, setFocused] = React.useState(false);
  return (
    <>
      <Field label={titleLabel} name={titleName}>
        <Input
          name={titleName}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!touched) setSlug(slugify(e.target.value));
          }}
        />
      </Field>
      <Field
        label="Slug"
        name="slug"
        helper={!isNew && focused ? "Changing this breaks old links." : (slugHelper ?? "Lowercase words joined by dashes.")}
      >
        <Input
          name="slug"
          prefix={slugPrefix}
          mono
          value={slug}
          onChange={(e) => {
            setTouched(true);
            setSlug(e.target.value);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
    </>
  );
}
