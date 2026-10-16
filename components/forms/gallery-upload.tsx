"use client";

/* GalleryUpload — ordered multi-image field (docs/DESIGN-BRIEF.md §4,
 * project gallery). A grid of 16:9 tiles, 4 columns ≥1024px, 2 below. Each
 * tile: position number, "No alt" chip when alt is missing, ← Earlier /
 * Later → buttons, Remove, and its alt text. The last tile is an "Add
 * image" drop box (several files at once). Order changes are kept in the
 * form and saved with it; no drag.
 *
 * Posts a hidden input `name` with a JSON array of { id, alt } |
 * { upload, alt } in display order (lib/actions/media-helpers.ts →
 * readGalleryField). The cover is a separate <ImageUpload>. */

/* eslint-disable @next/next/no-img-element -- blob: previews of the user's
   own files cannot go through next/image; saved images use it. */

import { CircleAlert, Plus } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { Pill } from "@/components/ui/pill";
import { discardUploads } from "@/lib/actions/media";
import { formatBytes, ImageError, processImage } from "@/lib/images/encode";
import { uploadImage, type MediaKind, type UploadResult } from "@/lib/images/upload";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { useFormBusy } from "./edit-form";
import { FieldError } from "./field";
import { useFieldError } from "./form-errors";
import type { ExistingImage } from "./image-upload";
import { Input } from "./input";
import { UpDownButtons } from "./up-down-buttons";

type Tile =
  | { key: string; kind: "existing"; image: ExistingImage; alt: string }
  | { key: string; kind: "uploaded"; upload: UploadResult; preview: string; originalBytes: number; alt: string };

export interface GalleryUploadProps {
  name: string;
  label: string;
  kind: MediaKind;
  initial: ExistingImage[];
  slug?: string;
}

let counter = 0;
const nextKey = () => `t${++counter}`;

export function GalleryUpload({ name, label, kind, initial, slug }: GalleryUploadProps) {
  const [tiles, setTiles] = React.useState<Tile[]>(() =>
    initial.map((image) => ({ key: nextKey(), kind: "existing", image, alt: image.alt })),
  );
  const [busyCount, setBusyCount] = React.useState(0);
  const [failure, setFailure] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const hiddenRef = React.useRef<HTMLInputElement>(null);
  const uid = React.useId().replace(/:/g, "");
  const error = useFieldError(name);

  useFormBusy(`gallery:${name}`, busyCount > 0);

  const json = JSON.stringify(
    tiles.map((t) => (t.kind === "existing" ? { id: t.image.id, alt: t.alt } : { upload: t.upload, alt: t.alt })),
  );
  // Compare with the last value (not a first-run flag: Strict Mode runs
  // effects twice on mount).
  const lastJson = React.useRef(json);
  React.useEffect(() => {
    if (lastJson.current === json) return;
    lastJson.current = json;
    hiddenRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }, [json]);

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setFailure(null);
    const list = Array.from(files);
    setBusyCount((n) => n + list.length);
    for (const file of list) {
      try {
        const processed = await processImage(file);
        const upload = await uploadImage(processed, { kind, slug });
        setTiles((prev) => [
          ...prev,
          {
            key: nextKey(),
            kind: "uploaded",
            upload,
            preview: URL.createObjectURL(file),
            originalBytes: processed.originalBytes,
            alt: "",
          },
        ]);
      } catch (e) {
        setFailure(
          e instanceof ImageError ? `${file.name}: ${e.message}` : `${file.name}: Upload failed. Check your connection.`,
        );
      } finally {
        setBusyCount((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const move = (index: number, dir: "up" | "down") => {
    setTiles((prev) => {
      const j = dir === "up" ? index - 1 : index + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const remove = (key: string) => {
    setTiles((prev) => {
      const t = prev.find((x) => x.key === key);
      if (t?.kind === "uploaded") {
        void discardUploads([t.upload.path, t.upload.thumb_path]);
        URL.revokeObjectURL(t.preview);
      }
      return prev.filter((x) => x.key !== key);
    });
  };

  const setAlt = (key: string, alt: string) =>
    setTiles((prev) => prev.map((t) => (t.key === key ? { ...t, alt } : t)));

  return (
    <div className="flex min-w-0 flex-col gap-2" role="group" aria-labelledby={`${uid}-label`}>
      <span id={`${uid}-label`} className="text-sm font-medium text-ink">
        {label} <span className="font-normal text-ink-muted">(optional)</span>
      </span>
      <input ref={hiddenRef} type="hidden" name={name} value={json} />
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/avif,image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => void addFiles(e.target.files)}
      />
      <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t, i) => {
          const src = t.kind === "existing" ? t.image.src : t.preview;
          const label = `image ${i + 1}`;
          return (
            <li key={t.key} className="flex min-w-0 flex-col gap-1.5">
              <div className="relative aspect-video overflow-hidden rounded-control border border-line bg-surface-2">
                {t.kind === "existing" ? (
                  <Image src={src} alt="" fill sizes="(min-width: 1024px) 11rem, 50vw" className="object-cover" />
                ) : (
                  <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
                )}
                <span className="absolute top-1.5 left-1.5 rounded-control bg-surface/90 px-1.5 text-label text-ink tabular-nums">
                  {i + 1}
                </span>
                {!t.alt.trim() ? (
                  <Pill className="absolute top-1.5 right-1.5 border-warning bg-warning-quiet text-warning">No alt</Pill>
                ) : null}
              </div>
              {t.kind === "uploaded" ? (
                <span className="truncate text-xs text-ink-muted">
                  {formatBytes(t.originalBytes)} → {formatBytes(t.upload.bytes)}
                </span>
              ) : null}
              <label className="sr-only" htmlFor={`${uid}-alt-${t.key}`}>
                Alt text for image {i + 1}
              </label>
              <Input
                id={`${uid}-alt-${t.key}`}
                placeholder="Alt text"
                value={t.alt}
                onChange={(e) => setAlt(t.key, e.target.value)}
              />
              <div className="flex items-center justify-between gap-1">
                <UpDownButtons
                  orientation="horizontal"
                  itemLabel={label}
                  isFirst={i === 0}
                  isLast={i === tiles.length - 1}
                  onMove={(dir) => move(i, dir)}
                />
                <Button size="sm" variant="text" onClick={() => remove(t.key)} aria-label={`Remove ${label}`}>
                  Remove
                </Button>
              </div>
            </li>
          );
        })}
        <li>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              void addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "grid aspect-video place-items-center rounded-control border border-dashed px-2 text-center transition-colors",
              dragOver ? "border-accent bg-accent-quiet" : "border-line-strong",
            )}
          >
            {busyCount > 0 ? (
              <span role="status" className="text-xs text-ink-muted">
                Compressing and uploading {busyCount}…
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Plus aria-hidden="true" className="size-4" />
                Add image
              </Button>
            )}
          </div>
        </li>
      </ol>
      <p className="text-xs text-ink-muted">
        JPEG, PNG, WebP or AVIF. Compressed in your browser before upload. Every image needs alt text.
      </p>
      {failure ? (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 flex-none" />
          {failure}
        </p>
      ) : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
