"use client";

/* OpportunityForm — the Locator edit form (docs/LOCATOR.md, "Edit and New
 * screens"; brief §3). EditForm → saveOpportunity, EditColumns with the
 * rail: Status, the eligibility card (passed in by the edit page),
 * Verified, the interest card and the Source card (both passed in), Record.
 * Event kinds get a "Signup opens" date; hackathons a "Hackathon details"
 * section (team size, prizes, what's provided; 0005). Fields a kind does not
 * show travel as hidden inputs so a save keeps them. Sync rows carry a
 * note under Basics on which fields the sync keeps refreshing
 * (docs/LOCATOR-SYNC.md).
 *
 * Defaults come from the saved row, or from an imported draft on the New
 * screen. The parent remounts the form (key) when a new draft arrives, so
 * every defaultValue re-applies. */

import { useRouter } from "next/navigation";
import * as React from "react";

import { PublishCard, TitleSlugFields } from "@/components/admin/edit-client";
import { EditColumns, FormSection, RailCard, RecordCard } from "@/components/admin/edit-layout";
import { Button } from "@/components/forms/button";
import { Checkbox } from "@/components/forms/checkbox";
import { EditForm } from "@/components/forms/edit-form";
import { Field, FieldError } from "@/components/forms/field";
import { useFieldError } from "@/components/forms/form-errors";
import { Input, Select, Textarea } from "@/components/forms/input";
import { RadioCards } from "@/components/forms/radio-cards";
import { markOpportunityVerified, saveOpportunity } from "@/lib/actions/opportunities";
import type { OpportunityDraft } from "@/lib/ai/locator-schemas";
import { formatDateOnly } from "@/lib/data/dates";
import { AREA_LABELS, FORMAT_LABELS, KIND_CONFIG, postingSiteFromUrl, TERM_LABELS } from "@/lib/data/locator";
import type { InternshipTerm, Opportunity, OpportunityArea, OpportunityFormat, OpportunityKind } from "@/lib/data/types";

const AREAS: OpportunityArea[] = ["suffolk", "boston", "outside_boston", "online"];
const AREA_HINTS: Record<OpportunityArea, string> = {
  suffolk: "On Suffolk's campus.",
  boston: "Boston, Cambridge and nearby.",
  outside_boston: "In person, anywhere else.",
  online: "Fully online.",
};
const FORMATS: OpportunityFormat[] = ["in_person", "online", "hybrid"];
const TERMS: InternshipTerm[] = ["coop", "semester_part_time", "summer", "winter"];
const SUMMARY_MAX = 200;

const DEADLINE_LABEL: Record<OpportunityKind, string> = {
  internship: "Application deadline",
  conference: "Registration deadline",
  networking: "Registration deadline",
  hackathon: "Signup closes",
};

const ORGANIZER_LABEL: Record<OpportunityKind, string> = {
  internship: "Company",
  conference: "Organizer",
  networking: "Host",
  hackathon: "Organizer",
};

/** Client-side slug proposal (the server's slugifyTitle is server-only). */
function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface OpportunityFormProps {
  kind: OpportunityKind;
  /** The saved row; null on the New screen. */
  opportunity: Opportunity | null;
  /** Imported draft (New screen). */
  draft?: OpportunityDraft | null;
  /** Rail block between Status and Verified (the eligibility card). */
  eligibility?: React.ReactNode;
  /** Rail block under Verified, above Source (the members-interested card). */
  interest?: React.ReactNode;
  /** Rail block under Verified (the Source card). */
  source?: React.ReactNode;
}

export function OpportunityForm({ kind, opportunity: o, draft, eligibility, interest, source }: OpportunityFormProps) {
  const cfg = KIND_CONFIG[kind];
  const isNew = o === null;
  // Saved row first, then any field the imported draft found.
  const d: Partial<Opportunity> = { ...o };
  if (draft) {
    for (const [k, v] of Object.entries(draft)) {
      if (v !== null && v !== undefined && k !== "confidence_notes") (d as Record<string, unknown>)[k] = v;
    }
  }
  const text = (k: keyof Opportunity) => {
    const v = d[k];
    return typeof v === "string" ? v : "";
  };

  const title = text("title");
  const url = text("url");
  const [postingSite, setPostingSite] = React.useState(text("posting_site"));
  const [summary, setSummary] = React.useState(text("summary"));
  const area = d.area ?? "boston";
  const format = d.format ?? (area === "online" ? "online" : "in_person");
  const terms = d.internship_terms ?? [];
  const tags = d.tags ?? [];

  const hidden: Record<string, string> = { kind };
  if (o) hidden.id = o.id;
  if (draft) hidden.source = "import";

  return (
    <EditForm action={saveOpportunity} itemName={title || `this ${cfg.noun}`} hidden={hidden} isNew={isNew}>
      <EditColumns
        rail={
          <>
            <PublishCard defaultPublished={o?.published ?? true} helperOn="Listed in Locator" />
            {eligibility}
            <VerifiedCard id={o?.id ?? null} verifiedOn={o?.verified_on ?? null} />
            {interest}
            {source}
            <RecordCard createdAt={o?.created_at} updatedAt={o?.updated_at} />
          </>
        }
      >
        <FormSection title="Basics">
          <TitleSlugFields
            defaultTitle={title}
            defaultSlug={o?.slug ?? slugify(title)}
            isNew={isNew}
            slugHelper="Lowercase words joined by dashes. Proposed from the title."
          />
          <Field label={ORGANIZER_LABEL[kind]} name="organizer">
            <Input name="organizer" defaultValue={text("organizer")} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={`${ORGANIZER_LABEL[kind]} website`} name="organizer_url" optional>
              <Input name="organizer_url" type="url" inputMode="url" placeholder="https://" defaultValue={text("organizer_url")} />
            </Field>
            <Field label={`About the ${ORGANIZER_LABEL[kind].toLowerCase()}`} name="organizer_blurb" optional>
              <Input name="organizer_blurb" defaultValue={text("organizer_blurb")} />
            </Field>
          </div>
          <Field label="Posting URL" name="url" helper="The posting or event page members will open.">
            <Input
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://"
              defaultValue={url}
              onBlur={(e) => {
                if (!postingSite.trim()) {
                  const site = postingSiteFromUrl(e.target.value);
                  if (site) setPostingSite(site);
                }
              }}
            />
          </Field>
          <Field label="Posting site" name="posting_site" optional helper="Filled from the URL when left empty.">
            <Input name="posting_site" value={postingSite} onChange={(e) => setPostingSite(e.target.value)} />
          </Field>
          {o?.source === "sync" ? (
            <p className="text-xs text-ink-muted">
              Title, link, location, pay and dates follow the source on every sync. Everything else is yours once you
              save.
            </p>
          ) : null}
        </FormSection>

        <FormSection title="Details">
          <Field
            label="Summary"
            name="summary"
            optional
            helper={
              <span className={summary.length > SUMMARY_MAX ? "text-danger" : undefined}>
                One or two sentences. {summary.length}/{SUMMARY_MAX}
              </span>
            }
          >
            <Input name="summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </Field>
          <Field label="Description" name="description" optional>
            <Textarea name="description" rows={8} defaultValue={text("description")} />
          </Field>
          <Field label="Eligibility" name="eligibility" optional helper="Who can apply, as the source says it. The AI check reads this.">
            <Textarea name="eligibility" rows={3} defaultValue={text("eligibility")} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Pay or cost" name="pay" optional helper="$35/hr, Unpaid, Free to attend, …">
              <Input name="pay" defaultValue={text("pay")} />
            </Field>
            <Field label="Tags" name="tags" optional helper="Comma-separated: ai, ieee, research, startups, security, web.">
              <Input name="tags" defaultValue={tags.join(", ")} autoComplete="off" />
            </Field>
          </div>
        </FormSection>

        <FormSection title="When and where">
          <AreaField defaultValue={area} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Format" name="format">
              <Select name="format" defaultValue={format}>
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {FORMAT_LABELS[f]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Location" name="location" optional helper="Cambridge, MA or Online.">
              <Input name="location" defaultValue={text("location")} />
            </Field>
          </div>
          {cfg.dated ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Starts" name="starts_on" optional>
                <Input name="starts_on" type="date" defaultValue={text("starts_on")} />
              </Field>
              <Field label="Ends" name="ends_on" optional>
                <Input name="ends_on" type="date" defaultValue={text("ends_on")} />
              </Field>
            </div>
          ) : (
            <>
              <input type="hidden" name="starts_on" value={text("starts_on")} />
              <input type="hidden" name="ends_on" value={text("ends_on")} />
            </>
          )}
          {cfg.dated ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Signup opens" name="opens_on" optional>
                  <Input name="opens_on" type="date" defaultValue={text("opens_on")} />
                </Field>
                <Field label={DEADLINE_LABEL[kind]} name="deadline_on" optional>
                  <Input name="deadline_on" type="date" defaultValue={text("deadline_on")} />
                </Field>
              </div>
              <Field label="Dates note" name="dates_note" optional helper="Rolling, TBA, last year's dates, …">
                <Input name="dates_note" defaultValue={text("dates_note")} />
              </Field>
            </>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <input type="hidden" name="opens_on" value={text("opens_on")} />
              <Field label={DEADLINE_LABEL[kind]} name="deadline_on" optional>
                <Input name="deadline_on" type="date" defaultValue={text("deadline_on")} />
              </Field>
              <Field label="Dates note" name="dates_note" optional helper="Rolling, TBA, last year's dates, …">
                <Input name="dates_note" defaultValue={text("dates_note")} />
              </Field>
            </div>
          )}
        </FormSection>

        {kind === "hackathon" ? (
          <FormSection title="Hackathon details">
            <Field label="Team size" name="team_size" optional helper="1–4, Solo or up to 5, …">
              <Input name="team_size" defaultValue={text("team_size")} />
            </Field>
            <Field label="Prizes" name="prizes" optional helper="As the organizer states them: pool, tracks, sponsor prizes.">
              <Textarea name="prizes" rows={2} defaultValue={text("prizes")} />
            </Field>
            <Field label="What's provided" name="provided" optional helper="Meals, travel reimbursement, cloud credits, mentors, swag, …">
              <Textarea name="provided" rows={2} defaultValue={text("provided")} />
            </Field>
          </FormSection>
        ) : (
          <>
            <input type="hidden" name="team_size" value={text("team_size")} />
            <input type="hidden" name="prizes" value={text("prizes")} />
            <input type="hidden" name="provided" value={text("provided")} />
          </>
        )}

        {kind === "internship" ? (
          <FormSection title="Terms">
            <TermsField defaultValue={terms} />
          </FormSection>
        ) : null}
      </EditColumns>
    </EditForm>
  );
}

function AreaField({ defaultValue }: { defaultValue: OpportunityArea }) {
  const error = useFieldError("area");
  return (
    <RadioCards
      legend="Area"
      name="area"
      defaultValue={defaultValue}
      error={error}
      layout="row"
      options={AREAS.map((a) => ({ value: a, label: AREA_LABELS[a], description: AREA_HINTS[a] }))}
    />
  );
}

function TermsField({ defaultValue }: { defaultValue: InternshipTerm[] }) {
  const error = useFieldError("internship_terms");
  return (
    <fieldset className="flex flex-col" aria-describedby={error ? "terms-error" : undefined}>
      <legend className="sr-only">Internship terms</legend>
      <div className="grid sm:grid-cols-2">
        {TERMS.map((t) => (
          <Checkbox key={t} name="internship_terms" value={t} label={TERM_LABELS[t]} defaultChecked={defaultValue.includes(t)} />
        ))}
      </div>
      {error ? <FieldError id="terms-error">{error}</FieldError> : null}
    </fieldset>
  );
}

function VerifiedCard({ id, verifiedOn }: { id: string | null; verifiedOn: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  return (
    <RailCard title="Verified">
      {verifiedOn ? (
        <p className="text-sm text-ink">Verified {formatDateOnly(verifiedOn)}</p>
      ) : (
        <p className="text-sm text-warning">Never verified</p>
      )}
      {id ? (
        <div>
          <Button
            variant="outline"
            size="sm"
            pending={pending}
            pendingLabel="Marking…"
            onClick={() =>
              startTransition(async () => {
                await markOpportunityVerified(id);
                router.refresh();
              })
            }
          >
            Mark verified today
          </Button>
        </div>
      ) : null}
      <Field label="Verified on" name="verified_on" optional helper="When someone last checked the listing is still open.">
        {/* Keyed on the saved value so "Mark verified today" refreshes it. */}
        <Input key={verifiedOn ?? "none"} name="verified_on" type="date" defaultValue={verifiedOn ?? ""} />
      </Field>
    </RailCard>
  );
}
