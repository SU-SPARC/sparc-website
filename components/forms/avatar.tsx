/* Avatar — initials on bg-surface-2 (no generated colour palettes), or a
 * photo when one is given. 13px text minimum. Server-safe. */

import Image from "next/image";

import { cn } from "@/lib/utils";

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps {
  name: string | null | undefined;
  src?: string | null;
  /** sm 28px, md 36px, lg 48px. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "size-7", md: "size-9", lg: "size-12" } as const;
const px = { sm: 28, md: 36, lg: 48 } as const;

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid flex-none place-items-center overflow-hidden rounded-pill bg-surface-2 text-label text-ink-muted",
        sizes[size],
        className,
      )}
    >
      {src ? (
        <Image src={src} alt="" width={px[size]} height={px[size]} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
