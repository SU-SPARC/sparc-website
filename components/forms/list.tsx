/* ListTable + ListRow — the admin list pattern (brief §2).
 *
 * ≥640px: a real <table> (sr-only caption, column headers).
 * <640px: the same markup restyled as stacked blocks: thumb, then title +
 * meta + state stacked, with order/actions in a column on the right.
 *
 * Row anatomy (64px, border-t, last row border-b):
 *   thumb · title (the edit link) + meta · ...extra cells · state · controls
 * Pass the same column set to ListTable `columns` as the cells you give
 * ListRow, in that order. Server-safe.
 *
 *   <ListTable caption="Events" columns={[
 *     { label: "Image", srOnly: true }, { label: "Event" },
 *     { label: "Status" }, { label: "Actions", srOnly: true },
 *   ]}>
 *     <ListRow thumb={…} title="Fall kickoff" href="/admin/events/…"
 *              meta="Oct 3 · Room 8065" state={<StatePill published />}
 *              controls={<RowActions …/>} />
 *   </ListTable>
 */

import { ImageOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Pill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

import { initials } from "./avatar";

export interface ListColumn {
  label: string;
  srOnly?: boolean;
  /** Right-align (controls, dates). */
  end?: boolean;
  /** Hide on narrow screens (the cell content is repeated in meta). */
  className?: string;
}

export interface ListTableProps {
  caption: string;
  columns: ListColumn[];
  children: React.ReactNode;
  className?: string;
}

export function ListTable({ caption, columns, children, className }: ListTableProps) {
  return (
    <table className={cn("w-full border-collapse text-left max-sm:block", className)}>
      <caption className="sr-only">{caption}</caption>
      <thead className="max-sm:hidden">
        <tr>
          {columns.map((c, i) => (
            <th
              key={`${c.label}-${i}`}
              scope="col"
              className={cn(
                "pb-2 text-label font-medium uppercase text-ink-muted",
                i > 0 && "pl-4",
                c.end && "text-right",
                c.className,
              )}
              style={{ fontVariationSettings: '"wdth" var(--wdth-normal)' }}
            >
              {c.srOnly ? <span className="sr-only">{c.label}</span> : c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="max-sm:block [&>tr:last-child]:border-b">{children}</tbody>
    </table>
  );
}

export interface ListRowProps {
  /** Thumb cell. Omit to render no thumb column. */
  thumb?: React.ReactNode;
  title: React.ReactNode;
  /** The title links here (the edit page). */
  href?: string;
  meta?: React.ReactNode;
  /** Extra desktop columns between title and state. */
  extra?: Array<{ content: React.ReactNode; className?: string; end?: boolean }>;
  /** State pill. Shown in its own column ≥640px and under the title below. */
  state?: React.ReactNode;
  /** Up/down + ⋯ menu. */
  controls?: React.ReactNode;
  className?: string;
}

export function ListRow({ thumb, title, href, meta, extra, state, controls, className }: ListRowProps) {
  return (
    <tr
      className={cn(
        "border-t border-line align-middle",
        "max-sm:flex max-sm:items-start max-sm:gap-3 max-sm:py-3",
        className,
      )}
    >
      {thumb !== undefined ? <td className="w-14 py-3 max-sm:block max-sm:w-auto max-sm:py-0">{thumb}</td> : null}
      <td className={cn("min-w-0 py-3 max-sm:block max-sm:flex-1 max-sm:py-0", thumb !== undefined && "sm:pl-1")}>
        <div className="flex min-w-0 flex-col gap-0.5">
          {href ? (
            <Link
              href={href}
              className="max-w-full truncate rounded-control text-sm font-medium text-ink underline-offset-4 hover:underline"
            >
              {title}
            </Link>
          ) : (
            <span className="max-w-full truncate text-sm font-medium text-ink">{title}</span>
          )}
          {meta ? <span className="truncate text-xs text-ink-muted">{meta}</span> : null}
          {state ? <span className="mt-1 sm:hidden">{state}</span> : null}
        </div>
      </td>
      {extra?.map((cell, i) => (
        <td
          key={i}
          className={cn("py-3 pl-4 text-sm text-ink-muted max-sm:hidden", cell.end && "text-right", cell.className)}
        >
          {cell.content}
        </td>
      ))}
      {state !== undefined ? <td className="py-3 pl-4 max-sm:hidden">{state}</td> : null}
      {controls !== undefined ? (
        <td className="py-3 pl-4 max-sm:block max-sm:py-0 max-sm:pl-0">
          <div className="flex items-center justify-end gap-1 max-sm:flex-col">{controls}</div>
        </td>
      ) : null}
    </tr>
  );
}

/** "Published" (outline) or "Hidden" (outline, muted, dashed). */
export function StatePill({ published, labels }: { published: boolean; labels?: [string, string] }) {
  const [on, off] = labels ?? ["Published", "Hidden"];
  return published ? (
    <Pill className="whitespace-nowrap">{on}</Pill>
  ) : (
    <Pill className="border-dashed whitespace-nowrap text-ink-muted">{off}</Pill>
  );
}

export interface ListThumbProps {
  src?: string | null;
  /** Used for initials when there is no image. */
  name?: string;
  /** Icon fallback when there is no image and no name. */
  icon?: React.ReactNode;
}

/** 40px square thumb; never an empty box. */
export function ListThumb({ src, name, icon }: ListThumbProps) {
  return (
    <span className="relative grid size-10 flex-none place-items-center overflow-hidden rounded-control bg-surface-2 text-label text-ink-muted">
      {src ? (
        <Image src={src} alt="" fill sizes="40px" className="object-cover" />
      ) : name ? (
        initials(name)
      ) : (
        (icon ?? <ImageOff aria-hidden="true" className="size-4" />)
      )}
    </span>
  );
}
