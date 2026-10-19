/* Button — the one button for admin, dashboard and auth screens.
 * Server-safe. Do not use the legacy components/ui/button.tsx.
 *
 * Variants:
 *   primary         accent fill — the view's main action only
 *   outline         bordered, everything else
 *   text            no border, for low-weight actions ("Discard", "Sign out")
 *   danger          filled destructive, only inside a confirm dialog
 *   danger-outline  destructive trigger in a page's Delete section
 *
 * `pending` swaps the label for `pendingLabel` without changing the width:
 * both labels sit in the same grid cell and the inactive one is invisible. */

import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

import { WIDTH_NORMAL } from "./styles";

export type ButtonVariant = "primary" | "outline" | "text" | "danger" | "danger-outline";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-control text-sm font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover disabled:hover:bg-accent",
  outline: "border border-line bg-surface-1 text-ink hover:border-line-strong",
  text: "text-ink-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger text-on-danger hover:opacity-90",
  "danger-outline": "border border-danger bg-transparent text-danger hover:bg-danger-quiet",
};

/* 44px on touch screens (≤640px), smaller on pointer layouts. */
const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 sm:min-h-10",
  sm: "min-h-11 px-3 sm:min-h-8",
};

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Full width of the parent. */
  full?: boolean;
}

export function buttonClasses({ variant = "outline", size = "md", full }: ButtonStyleProps = {}) {
  return cn(base, variants[variant], sizes[size], full && "w-full");
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonStyleProps {
  /** Shows `pendingLabel`, disables the button, keeps its width. */
  pending?: boolean;
  pendingLabel?: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}

export function Button({
  variant,
  size,
  full,
  pending = false,
  pendingLabel,
  type = "button",
  disabled,
  className,
  children,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cn(buttonClasses({ variant, size, full }), className)}
      style={{ ...WIDTH_NORMAL, ...style }}
      {...props}
    >
      {pendingLabel === undefined ? (
        children
      ) : (
        <span className="grid">
          <span className={cn("col-start-1 row-start-1 inline-flex items-center justify-center gap-2", pending && "invisible")}>
            {children}
          </span>
          <span
            aria-hidden={!pending}
            className={cn("col-start-1 row-start-1 inline-flex items-center justify-center gap-2", !pending && "invisible")}
          >
            {pendingLabel}
          </span>
        </span>
      )}
    </button>
  );
}

export interface ButtonLinkProps
  extends Omit<React.ComponentProps<typeof Link>, "className">,
    ButtonStyleProps {
  className?: string;
}

/** A Next <Link> styled as a button. */
export function ButtonLink({ variant, size, full, className, style, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonClasses({ variant, size, full }), className)}
      style={{ ...WIDTH_NORMAL, ...style }}
      {...props}
    />
  );
}
