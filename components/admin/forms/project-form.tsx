"use client";

import * as React from "react";

import { EditColumns, FormSection, RecordCard } from "@/components/admin/edit-layout";
import { PublishCard, RefField, TitleSlugFields } from "@/components/admin/edit-client";
import { EditForm } from "@/components/forms/edit-form";
import { Field } from "@/components/forms/field";
import { GalleryUpload } from "@/components/forms/gallery-upload";
import { ImageUpload, type ExistingImage } from "@/components/forms/image-upload";
import { Input, Select, Textarea } from "@/components/forms/input";
import { RadioCards } from "@/components/forms/radio-cards";
import { saveProject } from "@/lib/actions/projects";

export type ProjectDefaults = {
  id: string | null;
  ref: string;
  slug: string;
  title: string;
  kind: "team" | "personal";
  status: "proposed" | "in_progress" | "completed" | "archived";
  term: string;
  summary: string;
  highlights: string[];
  methodology: "kanban" | "scrumban" | "scrum" | "safe";
  supervisor_kind: "faculty" | "student" | "none";
  supervisor_member_id: string;
  supervisor_name: string;
  repo_url: string;
  live_url: string;
  published: boolean;
  cover: ExistingImage | null;
  gallery: ExistingImage[];
  created_at: string | null;
  updated_at: string | null;
  requested_by: string | null;
};

export function ProjectForm({
  d,
  proposedRef,
  members,
}: {
  d: ProjectDefaults;
  proposedRef: string;
  members: Array<{ id: string; name: string }>;
}) {
  const isNew = d.id === null;
  const [supKind, setSupKind] = React.useState(d.supervisor_kind);
  return (
    <EditForm action={saveProject} itemName={d.title || "this project"} hidden={d.id ? { id: d.id } : undefined} isNew={isNew}>
      <EditColumns
        rail={
          <>
            <PublishCard defaultPublished={d.published} helperOn="Shown on /projects (unless Proposed)" />
            <RecordCard createdAt={d.created_at} updatedAt={d.updated_at} createdBy={d.requested_by ? `Requested by ${d.requested_by}` : null} />
          </>
        }
      >
        <FormSection title="Basics">
          <TitleSlugFields defaultTitle={d.title} defaultSlug={d.slug} isNew={isNew} />
          <div className="grid gap-5 sm:grid-cols-2">
            <RefField prefix="SP-" defaultValue={d.ref} proposed={proposedRef} isNew={isNew} />
            <Field label="Term" name="term" helper="e.g. Spring 2026">
              <Input name="term" defaultValue={d.term} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Status" name="status" helper="Approving a request from Requests also builds its board.">
              <Select name="status" defaultValue={d.status}>
                <option value="proposed">Proposed</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </Select>
            </Field>
            <Field label="Methodology" name="methodology" helper="Board template.">
              <Select name="methodology" defaultValue={d.methodology}>
                <option value="kanban">Kanban</option>
                <option value="scrumban">Scrumban</option>
                <option value="scrum">Scrum</option>
                <option value="safe">SAFe</option>
              </Select>
            </Field>
          </div>
          <RadioCards
            legend="Kind"
            name="kind"
            layout="row"
            defaultValue={d.kind}
            options={[
              { value: "team", label: "Team", description: "Several members." },
              { value: "personal", label: "Personal", description: "One member's project." },
            ]}
          />
        </FormSection>

        <FormSection title="Details">
          <Field label="Summary" name="summary" optional>
            <Textarea name="summary" rows={4} defaultValue={d.summary} />
          </Field>
          <Field label="Highlights" name="highlights" optional helper="One per line.">
            <Textarea name="highlights" rows={4} defaultValue={d.highlights.join("\n")} />
          </Field>
          <Field label="GitHub" name="repo_url" optional helper="https://github.com/…">
            <Input name="repo_url" type="url" inputMode="url" placeholder="https://github.com/SU-SPARC/…" defaultValue={d.repo_url} />
          </Field>
          <Field label="Live site" name="live_url" optional>
            <Input name="live_url" type="url" inputMode="url" placeholder="https://" defaultValue={d.live_url} />
          </Field>
        </FormSection>

        <FormSection title="Supervisor">
          <RadioCards
            legend="Supervised by"
            name="supervisor_kind"
            layout="row"
            value={supKind}
            onChange={(v) => setSupKind(v as typeof supKind)}
            options={[
              { value: "faculty", label: "Faculty", description: "A professor or staff member." },
              { value: "student", label: "Student", description: "An experienced member." },
              { value: "none", label: "Not set", description: "Assign one before approval." },
            ]}
          />
          {supKind === "student" ? (
            <Field label="Member" name="supervisor_member_id" helper="Pick a card, or leave empty and type a name below.">
              <Select name="supervisor_member_id" defaultValue={d.supervisor_member_id}>
                <option value="">No card</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {supKind !== "none" ? (
            <Field label="Name" name="supervisor_name" optional={supKind === "student"} helper={supKind === "student" ? "Only for a student without a card." : undefined}>
              <Input name="supervisor_name" defaultValue={d.supervisor_name} />
            </Field>
          ) : null}
        </FormSection>

        <FormSection title="Media">
          <ImageUpload name="cover" label="Cover" kind="projects" aspect="wide" initial={d.cover} slug={d.slug || undefined} optional />
          <GalleryUpload name="gallery" label="Gallery" kind="projects" initial={d.gallery} slug={d.slug || undefined} />
        </FormSection>
      </EditColumns>
    </EditForm>
  );
}
