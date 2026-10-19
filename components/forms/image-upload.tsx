"use client";

/* ImageUpload — single image field.
 *
 * States: empty drop box → compressing (preview + indeterminate bar) →
 * uploading → done (preview, "IMG_4412.jpg · 4.2 MB → 286 KB · 2000×1500",
 * Replace / Remove) with a required alt-text textarea under it. HEIC and
 * other failures show role="alert" errors in the box.
 *
 * The file is compressed in the browser (lib/images/encode.ts) and uploaded
 * straight to Storage (lib/images/upload.ts). Nothing is written to the
 * database until the surrounding form is saved: the field posts a hidden
 * input `name` holding JSON (see lib/actions/media-helpers.ts):
 *   null | { id, alt } | { upload: UploadResult, alt }
 * The form's server action turns that into a media id. While compressing or
 * uploading, the surrounding <EditForm>'s Save is blocked.
 *
 * Removing or replacing an upload that was never saved deletes its objects
 * (discardUploads). Removing a saved image only changes the field; the
 * server action deletes the old row and objects after the save. */

/* eslint-disable @next/next/no-img-element -- previews are blob: URLs of
   the user's own file, which next/image cannot load; saved images use it. */

import { CircleAlert, Upload } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { discardUploads } from "@/lib/actions/media";
import { formatBytes, ImageError, processImage, UNREADABLE_MESSAGE } from "@/lib/images/encode";
import { uploadImage, type MediaKind, type UploadResult } from "@/lib/images/upload";
import { cn } from "@/lib/utils";

import { Button } from "./button";
import { useFormBusy } from "./edit-form";
import { FieldError } from "./field";
import { useFieldError } from "./form-errors";
import { Textarea } from "./input";

export type ExistingImage = {
  id: string;
  alt: string;
  /** Display URL (thumb or full). */
  src: string;
  width: number;
  height: number;
  bytes?: number | null;
  original_name?: string | null;
};

export type ImageAspect = "square" | "wide" | "photo";
const ASPECT: Record<ImageAspect, string> = {
  square: "aspect-square",
  wide: "aspect-video",
  photo: "aspect-[4/3]",
};

type Value =
  | { kind: "none" }
  | { kind: "existing"; image: ExistingImage; alt: string }
  | { kind: "busy"; stage: "compressing" | "uploading"; preview: string; name: string; originalBytes: number }
  | { kind: "uploaded"; upload: UploadResult; preview: string; originalBytes: number; alt: string };

type Failure = { message: string; retry?: () => void; heic?: boolean };

export interface ImageUploadProps {
  /** Form field name for the hidden JSON input; also the error key. */
  name: string;
  label: string;
  kind: MediaKind;
  aspect?: ImageAspect;
  initial?: ExistingImage | null;
  /** Base for the stored file name (e.g. the item slug). */
  slug?: string;
  optional?: boolean;
  /** Smaller box (used inside a gallery tile grid or a narrow card). */
  compact?: boolean;
  /** Called with the posted value (for parents that need it). */
  onValueChange?: (json: string) => void;
}

export function ImageUpload({
  name,
  label,
  kind,
  aspect = "wide",
  initial,
  slug,
  optional,
  compact,
  onValueChange,
}: ImageUploadProps) {
  const [value, setValue] = React.useState<Value>(
    initial ? { kind: "existing", image: initial, alt: initial.alt } : { kind: "none" },
  );
  const [failure, setFailure] = React.useState<Failure | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const hiddenRef = React.useRef<HTMLInputElement>(null);
  const altRef = React.useRef<HTMLTextAreaElement>(null);
  const uid = React.useId().replace(/:/g, "");
  const error = useFieldError(name);

  useFormBusy(`image:${name}`, value.kind === "busy");

  const json =
    value.kind === "existing"
      ? JSON.stringify({ id: value.image.id, alt: value.alt })
      : value.kind === "uploaded"
        ? JSON.stringify({ upload: value.upload, alt: value.alt })
        : value.kind === "none"
          ? "null"
          : "";

  // Tell the form something changed (hidden inputs fire no events).
  // Compare with the last value (not a first-run flag: Strict Mode runs
  // effects twice on mount).
  const lastJson = React.useRef(json);
  React.useEffect(() => {
    if (lastJson.current === json) return;
    lastJson.current = json;
    hiddenRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
    onValueChange?.(json);
  }, [json, onValueChange]);

  // Revoke blob: previews when they go away.
  const preview = value.kind === "busy" || value.kind === "uploaded" ? value.preview : null;
  React.useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const discardCurrent = React.useCallback((v: Value) => {
    if (v.kind === "uploaded") void discardUploads([v.upload.path, v.upload.thumb_path]);
  }, []);

  const handleFile = async (file: File) => {
    setFailure(null);
    const previous = value;
    const previewUrl = URL.createObjectURL(file);
    try {
      setValue({ kind: "busy", stage: "compressing", preview: previewUrl, name: file.name, originalBytes: file.size });
      const processed = await processImage(file);
      setValue({ kind: "busy", stage: "uploading", preview: previewUrl, name: file.name, originalBytes: file.size });
      let upload: UploadResult;
      try {
        upload = await uploadImage(processed, { kind, slug });
      } catch {
        URL.revokeObjectURL(previewUrl);
        setValue(previous);
        setFailure({ message: "Upload failed. Check your connection.", retry: () => void handleFile(file) });
        return;
      }
      discardCurrent(previous);
      const alt = previous.kind === "existing" || previous.kind === "uploaded" ? previous.alt : "";
      setValue({ kind: "uploaded", upload, preview: previewUrl, originalBytes: processed.originalBytes, alt });
      setTimeout(() => altRef.current?.focus(), 0);
    } catch (e) {
      URL.revokeObjectURL(previewUrl);
      setValue(previous);
      if (e instanceof ImageError) setFailure({ message: e.message, heic: e.code === "heic" });
      else setFailure({ message: UNREADABLE_MESSAGE });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onPick = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void handleFile(file);
  };

  const remove = () => {
    discardCurrent(value);
    setValue({ kind: "none" });
    setFailure(null);
  };

  const setAlt = (alt: string) => {
    setValue((v) => (v.kind === "existing" || v.kind === "uploaded" ? { ...v, alt } : v));
  };

  const busy = value.kind === "busy";
  const hasImage = value.kind === "existing" || value.kind === "uploaded";
  const altError = hasImage && error === "Add alt text." ? error : undefined;
  const boxError = !altError ? error : undefined;

  const input = (
    <input
      ref={fileRef}
      id={`${uid}-file`}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/avif,image/*"
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => onPick(e.target.files)}
    />
  );

  return (
    <div className="flex min-w-0 flex-col gap-2" role="group" aria-labelledby={`${uid}-label`}>
      <span id={`${uid}-label`} className="text-sm font-medium text-ink">
        {label}
        {optional ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
      </span>
      <input ref={hiddenRef} type="hidden" name={name} value={json} />
      {input}

      {!hasImage && !busy ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onPick(e.dataTransfer.files);
          }}
          className={cn(
            "grid place-items-center rounded-card border border-dashed px-4 text-center transition-colors",
            compact ? "py-6" : ASPECT[aspect],
            !compact && "max-h-80 w-full",
            failure?.heic || boxError ? "border-danger" : dragOver ? "border-accent bg-accent-quiet" : "border-line-strong",
          )}
        >
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-sm text-ink">Drop an image or</p>
            <Button size="sm" onClick={() => fileRef.current?.click()} aria-describedby={`${uid}-hint`}>
              <Upload aria-hidden="true" className="size-4" />
              Choose file
            </Button>
          </div>
        </div>
      ) : (
        <div className={cn("relative w-full overflow-hidden rounded-card border border-line bg-surface-2", ASPECT[aspect], !compact && "max-h-80")}>
          {value.kind === "existing" ? (
            <Image
              src={value.image.src}
              alt=""
              fill
              sizes="(min-width: 1024px) 44rem, 100vw"
              className="object-cover"
            />
          ) : value.kind === "uploaded" || value.kind === "busy" ? (
            <img src={value.preview} alt="" className="absolute inset-0 size-full object-cover" />
          ) : null}
          {busy ? (
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-surface/90 px-3 py-2" role="status">
              <span className="text-xs text-ink">
                {value.stage === "compressing" ? "Compressing…" : "Uploading…"}
              </span>
              <span className="relative block h-1 overflow-hidden rounded-pill bg-surface-2">
                <span className="absolute inset-0 animate-pulse rounded-pill bg-accent motion-reduce:animate-none motion-reduce:opacity-60" />
              </span>
            </div>
          ) : null}
        </div>
      )}

      <p id={`${uid}-hint`} className="text-xs text-ink-muted">
        {hasImage ? <ImageFacts value={value} /> : "JPEG, PNG, WebP or AVIF. Compressed in your browser before upload."}
      </p>

      {hasImage ? (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="text" onClick={() => fileRef.current?.click()}>
            Replace
          </Button>
          <Button size="sm" variant="text" onClick={remove}>
            Remove
          </Button>
        </div>
      ) : null}

      {failure ? (
        <div role="alert" className="flex flex-wrap items-start gap-2 text-xs text-danger">
          <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 flex-none" />
          <span className="min-w-0 flex-1">{failure.message}</span>
          {failure.retry ? (
            <Button size="sm" variant="outline" onClick={failure.retry}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
      {boxError && !failure ? <FieldError>{boxError}</FieldError> : null}

      {hasImage ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${uid}-alt`} className="text-sm font-medium text-ink">
            Alt text
          </label>
          <Textarea
            ref={altRef}
            id={`${uid}-alt`}
            rows={2}
            value={value.alt}
            onChange={(e) => setAlt(e.target.value)}
            aria-invalid={altError ? true : undefined}
            aria-describedby={`${uid}-alt-help${altError ? ` ${uid}-alt-err` : ""}`}
          />
          <p id={`${uid}-alt-help`} className="text-xs text-ink-muted">
            What's in the photo, for screen readers. e.g. 'Four members at a whiteboard planning a sprint.'
          </p>
          {altError ? <FieldError id={`${uid}-alt-err`}>{altError}</FieldError> : null}
        </div>
      ) : null}
    </div>
  );
}

function ImageFacts({ value }: { value: Value }) {
  if (value.kind === "uploaded") {
    const u = value.upload;
    return (
      <>
        {u.original_name} · {formatBytes(value.originalBytes)} → {formatBytes(u.bytes)} · {u.width}×{u.height}
      </>
    );
  }
  if (value.kind === "existing") {
    const i = value.image;
    return (
      <>
        {[i.original_name, i.bytes ? formatBytes(i.bytes) : null, `${i.width}×${i.height}`].filter(Boolean).join(" · ")}
      </>
    );
  }
  return null;
}
