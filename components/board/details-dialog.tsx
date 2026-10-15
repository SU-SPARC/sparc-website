"use client";

/* "Edit details" for project members: the public description columns
 * (summary, highlights, repo and live links). Status, ref, publishing and
 * the cover stay with the e-board (admin project form). */

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Input, Textarea } from "@/components/forms/input";
import { updateProjectDetails } from "@/lib/actions/projects-pm";

export function DetailsDialog({
  projectId,
  title,
  summary,
  highlights,
  repoUrl,
  liveUrl,
}: {
  projectId: string;
  title: string;
  summary: string | null;
  highlights: string[];
  repoUrl: string | null;
  liveUrl: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [v, setV] = React.useState({ summary: "", highlights: "", repoUrl: "", liveUrl: "" });
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const start = () => {
    setV({ summary: summary ?? "", highlights: highlights.join("\n"), repoUrl: repoUrl ?? "", liveUrl: liveUrl ?? "" });
    setErrors({});
    setError(null);
    setOpen(true);
  };
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  return (
    <>
      <Button variant="text" size="sm" onClick={start}>
        Edit details
      </Button>
      <span aria-live="polite" className="text-xs text-success">
        {saved ? "Saved" : ""}
      </span>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Edit ${title}`}
        tone="default"
        confirmLabel="Save details"
        pendingLabel="Saving…"
        onConfirm={async () => {
          const r = await updateProjectDetails({ projectId, ...v });
          if (r.ok) {
            setOpen(false);
            setSaved(true);
            router.refresh();
          } else {
            setErrors(r.fieldErrors ?? {});
            setError(r.fieldErrors && Object.keys(r.fieldErrors).length ? null : r.error);
          }
        }}
        formContent={
          <div className="flex flex-col gap-4 text-ink">
            <p className="text-ink-muted">Shown on the public project page once the e-board publishes it.</p>
            <Field label="Summary" optional error={errors.summary?.[0]}>
              <Textarea rows={3} value={v.summary} onChange={set("summary")} />
            </Field>
            <Field label="Highlights" optional helper="One per line." error={errors.highlights?.[0]}>
              <Textarea rows={4} value={v.highlights} onChange={set("highlights")} />
            </Field>
            <Field label="GitHub repo URL" optional error={errors.repoUrl?.[0]}>
              <Input type="url" value={v.repoUrl} onChange={set("repoUrl")} placeholder="https://github.com/SU-SPARC/…" />
            </Field>
            <Field label="Live URL" optional error={errors.liveUrl?.[0]}>
              <Input type="url" value={v.liveUrl} onChange={set("liveUrl")} placeholder="https://…" />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>
        }
      />
    </>
  );
}
