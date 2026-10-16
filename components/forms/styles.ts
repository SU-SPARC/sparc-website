/* Shared class strings for the form primitives.
 *
 * cn() is a plain join with no conflict resolution, so primitives expose
 * props (size, variant, invalid, full) instead of accepting class overrides
 * for the same property. These strings are the single source of truth. */

/** Text-like controls: input, select, textarea. 44px on touch, 40px from sm. */
export const controlBase =
  "w-full min-w-0 rounded-control border border-line bg-surface text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:bg-surface-1 disabled:text-ink-faint aria-[invalid=true]:border-danger";

export const controlHeight = "min-h-11 sm:min-h-10";

/** Width axis at normal for labels and buttons (body is condensed). */
export const WIDTH_NORMAL = { fontVariationSettings: '"wdth" var(--wdth-normal)' } as const;
