"use client";

/* The event's Recordings sub-list (brief §3): §2 row pattern with up/down
 * order, ⋯ menu (Edit, Publish/Unpublish, Delete…), and an inline form for
 * adding or editing one recording at a time. Separate from the event's
 * EditForm (no nested forms); each save is its own action. */

import { ArrowUpRight } from "lucide-react";
import * as React from "react";

import { ActionMenu } from "@/components/forms/action-menu";
import { Button } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { EmptyState } from "@/components/forms/empty-state";
import { Field } from "@/components/forms/field";
import { FieldErrorsProvider } from "@/components/forms/form-errors";
import { Input, Textarea } from "@/components/forms/input";
import { ListRow, ListTable, StatePill } from "@/components/forms/list";
import { Switch } from "@/components/forms/switch";
import { UpDownButtons } from "@/components/forms/up-down-buttons";
import { MicroLabel } from "@/components/ui/micro-label";
import type { FormState } from "@/lib/actions/form-state";
import { deleteRecording, moveRecording, saveRecording } from "@/lib/actions/recordings";
import { formatDateOnly } from "@/lib/data/dates";

export type RecordingRow = {
  id: string;
  title: string;
  recorded_on: string;
  kind: string;
  url: string;
  description: string | null;
  published: boolean;
};

export function RecordingsEditor({ eventId, rows, defaultDate }: { eventId: string; rows: RecordingRow[]; defaultDate: string }) {
  const [editing, setEditing] = React.useState<RecordingRow | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<RecordingRow | null>(null);
  const [, startTransition] = React.useTransition();
  const closeEditor = React.useCallback(() => setEditing(null), []);

  return (
    <section aria-labelledby="recordings-title" className="mt-10 flex max-w-text flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <MicroLabel as="h2" id="recordings-title">
          Recordings
        </MicroLabel>
        {editing === null ? (
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            Add recording
          </Button>
        ) : null}
      </div>

      {editing !== null ? (
        <RecordingForm
          key={editing === "new" ? "new" : editing.id}
          eventId={eventId}
          row={editing === "new" ? null : editing}
          defaultDate={defaultDate}
          onDone={closeEditor}
        />
      ) : null}

      {rows.length === 0 && editing === null ? (
        <EmptyState title="No recordings yet.">Zoom recordings of this event, listed under it on /events.</EmptyState>
      ) : rows.length > 0 ? (
        <ListTable
          caption="Recordings"
          columns={[{ label: "Recording" }, { label: "Status" }, { label: "Actions", srOnly: true, end: true }]}
        >
          {rows.map((r, i) => (
            <ListRow
              key={r.id}
              title={r.title}
              meta={`${formatDateOnly(r.recorded_on)} · ${r.kind}`}
              state={<StatePill published={r.published} />}
              controls={
                <>
                  <UpDownButtons
                    itemLabel={r.title}
                    isFirst={i === 0}
                    isLast={i === rows.length - 1}
                    onMove={(dir) => moveRecording(r.id, eventId, dir)}
                  />
                  <ActionMenu
                    label={`Actions for ${r.title}`}
                    items={[
                      { label: "Edit…", onSelect: () => setEditing(r) },
                      { label: "Open recording", href: r.url, external: true },
                      {
                        label: r.published ? "Unpublish" : "Publish",
                        onSelect: () =>
                          startTransition(async () => {
                            const fd = new FormData();
                            fd.set("id", r.id);
                            fd.set("title", r.title);
                            fd.set("recorded_on", r.recorded_on);
                            fd.set("kind", r.kind);
                            fd.set("url", r.url);
                            fd.set("description", r.description ?? "");
                            fd.set("published", r.published ? "false" : "true");
                            await saveRecording({}, fd);
                          }),
                      },
                      { type: "divider" },
                      { label: "Delete…", tone: "danger", onSelect: () => setDeleting(r) },
                    ]}
                  />
                </>
              }
            />
          ))}
        </ListTable>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title={deleting ? `Delete ${deleting.title}?` : ""}
        confirmLabel="Delete recording"
        pendingLabel="Deleting…"
        onConfirm={async () => {
          if (deleting) await deleteRecording(deleting.id);
          setDeleting(null);
        }}
      >
        <p>Removes this recording from /events. The Zoom file itself is not touched.</p>
      </ConfirmDialog>
    </section>
  );
}

function RecordingForm({
  eventId,
  row,
  defaultDate,
  onDone,
}: {
  eventId: string;
  row: RecordingRow | null;
  defaultDate: string;
  onDone: () => void;
}) {
  const [state, dispatch, pending] = React.useActionState<FormState, FormData>(saveRecording, {});
  const [, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state.ok) onDone();
    else
      (
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
        formRef.current?.querySelector<HTMLElement>("input:not([type=hidden])")
      )?.focus();
  }, [state, onDone]);

  return (
    <FieldErrorsProvider errors={state.fieldErrors}>
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
        className="flex flex-col gap-4 rounded-card border border-line-strong bg-surface-1 p-4"
        aria-label={row ? `Edit ${row.title}` : "Add recording"}
      >
        {row ? <input type="hidden" name="id" value={row.id} /> : null}
        <input type="hidden" name="event_id" value={eventId} />
        <Field label="Title" name="title">
          <Input name="title" defaultValue={row?.title ?? ""} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Recorded on" name="recorded_on">
            <Input name="recorded_on" type="date" defaultValue={row?.recorded_on ?? defaultDate} />
          </Field>
          <Field label="Kind" name="kind" optional>
            <Input name="kind" defaultValue={row?.kind ?? "Zoom Recording"} />
          </Field>
        </div>
        <Field label="Link" name="url">
          <Input name="url" type="url" inputMode="url" placeholder="https://" defaultValue={row?.url ?? ""} />
        </Field>
        <Field label="Description" name="description" optional>
          <Textarea name="description" rows={2} defaultValue={row?.description ?? ""} />
        </Field>
        <Switch name="published" label="Published" defaultChecked={row?.published ?? true} helperOn="Listed on /events" helperOff="Only editors can see this" />
        {state.error ? <p role="alert" className="text-sm text-danger">{state.error}</p> : null}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="outline" pending={pending} pendingLabel="Saving…">
            {row ? "Save recording" : "Add recording"}
          </Button>
          <Button variant="text" onClick={onDone}>
            Cancel
          </Button>
          {row ? (
            <a href={row.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
              Open <ArrowUpRight aria-hidden="true" className="size-4" />
            </a>
          ) : null}
        </div>
      </form>
    </FieldErrorsProvider>
  );
}
