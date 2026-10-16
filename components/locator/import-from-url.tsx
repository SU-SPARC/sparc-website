"use client";

/* Import from a link (docs/LOCATOR.md, "Edit and New screens"; R-L16,
 * R-L17). NewOpportunity owns the import action state and lifts a
 * successful draft into OpportunityForm, remounting it (key = draft
 * version) so every defaultValue re-applies. Nothing is saved until the
 * editor presses Save. */

import * as React from "react";

import { Button } from "@/components/forms/button";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/forms/input";
import { StatusBanner } from "@/components/forms/status-banner";
import { MicroLabel } from "@/components/ui/micro-label";
import { SurfaceCard } from "@/components/ui/surface-card";
import { initialFormState, type FormState } from "@/lib/actions/form-state";
import { importOpportunityFromUrl } from "@/lib/actions/locator-ai";
import { parseOpportunityDraft, type OpportunityDraft } from "@/lib/ai/locator-schemas";
import type { OpportunityKind } from "@/lib/data/types";

import { OpportunityForm } from "./opportunity-form";

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function importedNote(draft: OpportunityDraft): string {
  const notes = draft.confidence_notes.map((n) => n.trim().replace(/\.+$/, "")).filter(Boolean);
  return [`Imported from ${host(draft.url)}.`, notes.length ? `${notes.join("; ")}.` : null, "Check every field before saving."]
    .filter(Boolean)
    .join(" ");
}

export interface ImportFromUrlProps {
  kind: OpportunityKind;
  aiConfigured: boolean;
  state: FormState;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
}

export function ImportFromUrl({ kind, aiConfigured, state, pending, onSubmit }: ImportFromUrlProps) {
  const [url, setUrl] = React.useState("");
  return (
    <SurfaceCard as="div" className="flex max-w-text flex-col gap-3">
      <MicroLabel as="h2">Import from a link</MicroLabel>
      {aiConfigured ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(new FormData(e.currentTarget));
          }}
          className="flex flex-col gap-3"
        >
          <p className="text-sm text-ink-muted">
            Paste the posting page. The club&apos;s AI fills the form; check every field before saving.
          </p>
          <input type="hidden" name="kind" value={kind} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <Field label="Posting URL" name="url" hideLabel error={state.fieldErrors?.url?.[0]} className="flex-1">
              <Input
                name="url"
                type="url"
                inputMode="url"
                placeholder="https://"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Button type="submit" variant="outline" pending={pending} pendingLabel="Reading page…" disabled={!url.trim()}>
              Import
            </Button>
          </div>
          <p aria-live="polite" className="text-xs text-danger empty:hidden">
            {!pending && state.error ? state.error : null}
          </p>
        </form>
      ) : (
        <p className="text-sm text-ink-muted">
          AI import needs the club&apos;s Anthropic API key on the server. See docs/LOCATOR.md.
        </p>
      )}
    </SurfaceCard>
  );
}

/** The New screen body: import card, banner, then the form. */
export function NewOpportunity({ kind, aiConfigured }: { kind: OpportunityKind; aiConfigured: boolean }) {
  const [state, dispatch, pending] = React.useActionState(importOpportunityFromUrl, initialFormState);
  const [, startTransition] = React.useTransition();
  const [lastHandled, setLastHandled] = React.useState<FormState>(initialFormState);
  const [draft, setDraft] = React.useState<OpportunityDraft | null>(null);
  const [version, setVersion] = React.useState(0);

  // Adjust state during render when a new import result arrives.
  if (state !== lastHandled) {
    setLastHandled(state);
    const next = state.ok ? parseOpportunityDraft(state.data?.draft) : null;
    if (next) {
      setDraft(next);
      setVersion((v) => v + 1);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ImportFromUrl
        kind={kind}
        aiConfigured={aiConfigured}
        state={state.ok && !parseOpportunityDraft(state.data?.draft) ? { error: "The import returned nothing usable. Fill the form by hand." } : state}
        pending={pending}
        onSubmit={(fd) => startTransition(() => dispatch(fd))}
      />
      {draft ? (
        <StatusBanner key={version} tone="info" className="max-w-text">
          {importedNote(draft)}
        </StatusBanner>
      ) : null}
      <OpportunityForm key={version} kind={kind} opportunity={null} draft={draft} />
    </div>
  );
}
