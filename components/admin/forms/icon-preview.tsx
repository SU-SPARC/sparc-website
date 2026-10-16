"use client";

/* Live preview of a lucide icon by kebab-case name. Loaded lazily by the
 * link form only (it pulls in lucide's full icon map), and mirrors the
 * /links page's lookup: kebab-case → PascalCase key in `icons`. */

import { icons, Link as LinkIcon } from "lucide-react";

export default function IconPreview({ name }: { name: string }) {
  const key = name
    .trim()
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("") as keyof typeof icons;
  const known = key in icons;
  const Shown = known ? icons[key] : LinkIcon;
  return (
    <span className="flex items-center gap-2 text-xs text-ink-muted">
      <span className="grid size-10 place-items-center rounded-control border border-line bg-surface text-ink">
        <Shown aria-hidden="true" className="size-5" />
      </span>
      {name.trim() === "" ? "No icon: the link icon is used." : known ? "Preview" : "Unknown name: the link icon is used."}
    </span>
  );
}
