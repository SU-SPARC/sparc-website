"use client";

import { EditColumns, FormSection, RecordCard } from "@/components/admin/edit-layout";
import { PublishCard, TitleSlugFields } from "@/components/admin/edit-client";
import { Checkbox } from "@/components/forms/checkbox";
import { EditForm } from "@/components/forms/edit-form";
import { Field } from "@/components/forms/field";
import { ImageUpload, type ExistingImage } from "@/components/forms/image-upload";
import { Input, Textarea } from "@/components/forms/input";
import { RadioCards } from "@/components/forms/radio-cards";
import { Switch } from "@/components/forms/switch";
import { saveMember } from "@/lib/actions/members";

const KNOWN_BADGES = [
  { value: "founding", label: "Founding member" },
  { value: "collegiatex", label: "CollegiateX" },
];

export type MemberDefaults = {
  id: string | null;
  name: string;
  slug: string;
  nickname: string;
  class_year: string;
  status: "current" | "alumni";
  role: string;
  role_term: string;
  role_history: string[];
  badges: string[];
  participated: number[];
  bio: string;
  linkedin: string;
  website: string;
  eboard: boolean;
  published: boolean;
  photo: ExistingImage | null;
  created_at: string | null;
  updated_at: string | null;
  linkedAccount: string | null;
};

export function MemberForm({ d, years }: { d: MemberDefaults; years: number[] }) {
  const isNew = d.id === null;
  const extraBadges = d.badges.filter((b) => !KNOWN_BADGES.some((k) => k.value === b));
  const extraYears = d.participated.filter((y) => !years.includes(y));
  return (
    <EditForm action={saveMember} itemName={d.name || "this member"} hidden={d.id ? { id: d.id } : undefined} isNew={isNew}>
      <EditColumns
        rail={
          <>
            <PublishCard defaultPublished={d.published} helperOn="Shown on /about">
              <Switch name="eboard" label="E-board" defaultChecked={d.eboard} helperOn="Listed with the e-board" helperOff="Listed with members" />
            </PublishCard>
            {d.linkedAccount !== undefined && !isNew ? (
              <div className="rounded-card border border-line bg-surface-1 p-4 text-xs text-ink-muted">
                {d.linkedAccount ? (
                  <>
                    Linked account: <span className="text-ink [overflow-wrap:anywhere]">{d.linkedAccount}</span>. They can edit the
                    nickname, photo, bio and links.
                  </>
                ) : (
                  "No account is linked to this card."
                )}
              </div>
            ) : null}
            <RecordCard createdAt={d.created_at} updatedAt={d.updated_at} />
          </>
        }
      >
        <FormSection title="Basics">
          <TitleSlugFields titleLabel="Name" titleName="name" defaultTitle={d.name} defaultSlug={d.slug} isNew={isNew} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Nickname" name="nickname" optional>
              <Input name="nickname" defaultValue={d.nickname} />
            </Field>
            <Field label="Class year" name="class_year">
              <Input name="class_year" inputMode="numeric" mono defaultValue={d.class_year} />
            </Field>
          </div>
          <RadioCards
            legend="Status"
            name="status"
            layout="row"
            defaultValue={d.status}
            options={[
              { value: "current", label: "Current", description: "An active member." },
              { value: "alumni", label: "Alumni", description: "Graduated or moved on." },
            ]}
          />
        </FormSection>

        <FormSection title="Role">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Office" name="role" optional helper="e.g. President. Empty for a general member.">
              <Input name="role" defaultValue={d.role} />
            </Field>
            <Field label="Term" name="role_term" optional helper="e.g. 2026">
              <Input name="role_term" defaultValue={d.role_term} />
            </Field>
          </div>
          <Field label="Previous roles" name="role_history" optional helper="One per line.">
            <Textarea name="role_history" rows={2} defaultValue={d.role_history.join("\n")} />
          </Field>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium text-ink">Badges</legend>
            {KNOWN_BADGES.map((b) => (
              <Checkbox key={b.value} name="badges" value={b.value} label={b.label} defaultChecked={d.badges.includes(b.value)} />
            ))}
            <Field label="Other badges" name="badges_extra" optional helper="Comma-separated ids, e.g. hackathon-2026." className="mt-2">
              <Input name="badges_extra" defaultValue={extraBadges.join(", ")} />
            </Field>
          </fieldset>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm font-medium text-ink">Participated</legend>
            <div className="flex flex-wrap gap-x-5">
              {years.map((y) => (
                <Checkbox key={y} name="participated" value={String(y)} label={String(y)} defaultChecked={d.participated.includes(y)} />
              ))}
            </div>
            <Field label="Other years" name="participated_extra" optional helper="Comma-separated, e.g. 2023, 2024." className="mt-2">
              <Input name="participated_extra" defaultValue={extraYears.join(", ")} />
            </Field>
          </fieldset>
        </FormSection>

        <FormSection title="Card">
          <Field label="Bio" name="bio" optional>
            <Textarea name="bio" rows={4} defaultValue={d.bio} />
          </Field>
          <Field label="LinkedIn" name="linkedin" optional>
            <Input name="linkedin" type="url" inputMode="url" placeholder="https://www.linkedin.com/in/…" defaultValue={d.linkedin} />
          </Field>
          <Field label="Website" name="website" optional>
            <Input name="website" type="url" inputMode="url" placeholder="https://" defaultValue={d.website} />
          </Field>
        </FormSection>

        <FormSection title="Media">
          <ImageUpload name="photo" label="Photo" kind="members" aspect="square" initial={d.photo} slug={d.slug || undefined} optional />
        </FormSection>
      </EditColumns>
    </EditForm>
  );
}
