"use client";

/* Your Locator profile (docs/LOCATOR.md, "Locator profile"). One section,
 * EditForm → saveCareerProfile (own row only), with a Privacy rail card. */

import { EditColumns, FormSection, RailCard } from "@/components/admin/edit-layout";
import { EditForm } from "@/components/forms/edit-form";
import { Field } from "@/components/forms/field";
import { Input, Select, Textarea } from "@/components/forms/input";
import { saveCareerProfile } from "@/lib/actions/career-profile";
import { WORK_AUTH_LABELS } from "@/lib/data/locator";
import type { CareerProfile, DegreeLevel, WorkAuth } from "@/lib/data/types";

const DEGREES: Array<[DegreeLevel, string]> = [
  ["undergrad", "Undergraduate"],
  ["grad", "Graduate"],
  ["other", "Other"],
];
const WORK_AUTH: WorkAuth[] = ["prefer_not_to_say", "us_citizen_or_pr", "international_cpt_opt", "needs_sponsorship"];

export function CareerProfileForm({ profile }: { profile: CareerProfile | null }) {
  const p = profile;
  return (
    <EditForm action={saveCareerProfile} itemName="your Locator profile" isNew={p === null}>
      <EditColumns
        rail={
          <RailCard title="Privacy">
            <p className="text-sm text-ink-muted">
              Your Locator profile is readable only by you. Editors and admins can&apos;t see it.
            </p>
          </RailCard>
        }
      >
        <FormSection title="About you">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Major" name="major">
              <Input name="major" defaultValue={p?.major ?? ""} />
            </Field>
            <Field label="Minor" name="minor" optional>
              <Input name="minor" defaultValue={p?.minor ?? ""} />
            </Field>
            <Field label="Degree level" name="degree_level">
              <Select name="degree_level" defaultValue={p?.degree_level ?? "undergrad"}>
                {DEGREES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Expected graduation year" name="expected_grad_year">
              <Input
                name="expected_grad_year"
                type="number"
                inputMode="numeric"
                min={2020}
                max={2040}
                placeholder="2027"
                defaultValue={p?.expected_grad_year ?? ""}
              />
            </Field>
          </div>
          <Field label="Skills" name="skills" optional helper="Comma-separated: Python, React, SQL, …">
            <Input name="skills" defaultValue={(p?.skills ?? []).join(", ")} autoComplete="off" />
          </Field>
          <Field label="Interests" name="interests" optional helper="Comma-separated: machine learning, security, startups, …">
            <Input name="interests" defaultValue={(p?.interests ?? []).join(", ")} autoComplete="off" />
          </Field>
          <Field
            label="Career goals"
            name="goals"
            helper="What roles or fields you're aiming for. The eligibility check scores fit against this."
          >
            <Textarea name="goals" rows={4} defaultValue={p?.goals ?? ""} />
          </Field>
          <Field label="Availability and constraints" name="constraints" optional helper="Hours per week, travel, terms you can work.">
            <Textarea name="constraints" rows={3} defaultValue={p?.constraints ?? ""} />
          </Field>
          <Field
            label="Work authorization"
            name="work_auth"
            helper="Only you can see this. It's used so the check can read sponsorship requirements."
          >
            <Select name="work_auth" defaultValue={p?.work_auth ?? "prefer_not_to_say"}>
              {WORK_AUTH.map((w) => (
                <option key={w} value={w}>
                  {WORK_AUTH_LABELS[w]}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>
      </EditColumns>
    </EditForm>
  );
}
