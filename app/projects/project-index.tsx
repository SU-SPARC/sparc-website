"use client";

/* /projects — the type list, its hover preview and the row expand.
 *
 * A24 pattern: the index is TYPE, not thumbnails. Rows are hairline-ruled
 * lines of Martian; the cover image is a preview that appears beside the list
 * on hover, one at a time, and never enters the layout.
 *
 * Holds no content of its own. `projects` is passed in from the server page,
 * already sorted; every visible string comes from lib/content/projects.ts,
 * except two labels lifted from the page this replaces and cited at their use.
 *
 * ── the row ──────────────────────────────────────────────────────────────
 *
 * Collapsed, a row is the micro-label and the title and nothing else — the
 * accession line stays a line. The title IS the trigger: a <button> carrying
 * aria-expanded + aria-controls, styled exactly as the title was, opening the
 * row in place rather than leaving the page. Everything the reader needs to
 * know what the project is or was — the summary, what the team did, the link
 * out — lives in the expanded body.
 *
 * The expand is components/ui/expand.tsx and nothing here re-implements it:
 * there is exactly one grid-template-rows animation in this codebase and it
 * lives there. Its reduced-motion behaviour comes from the universal block in
 * globals.css, so no JS guard is needed or wanted for it.
 *
 * Rows open independently — any number at once, same as the /about member
 * cards. Open state and the preview are unrelated: the preview keys off
 * pointerenter on the <li> and never reads `open`, so hovering a closed row
 * and hovering an open one do the same thing.
 *
 * ── the preview mechanism ────────────────────────────────────────────────
 *
 * ONE piece of state — `active`, a single accession ref or null. That is what
 * enforces "one at a time": a second preview cannot be shown because there is
 * nowhere to record a second ref. All covers render into one stack inside one
 * frame; the one whose ref matches `active` sits at opacity 1 and every other
 * at 0, with no transition on the images themselves, so at any instant exactly
 * one is visible. Moving between rows is a hard cut, deliberately.
 *
 * The frame is the only thing that animates: opacity + transform, 200ms,
 * ease-out. Timeline, hovering a row from rest:
 *   0ms    opacity 0, translateY(8px), scale(.98)   — frame idle
 *   0ms    `active` set; the matching cover is already at opacity 1
 *   200ms  opacity 1, translateY(0), scale(1)       — frame at rest
 * Leaving the list runs the same 200ms in reverse. Row-to-row costs nothing:
 * `onPointerLeave` lives on the <ol>, not on each row, so crossing a hairline
 * never fires it and the frame stays put while the cover swaps underneath.
 *
 * ── the frame follows the row ────────────────────────────────────────────
 *
 * client, Aug 2026 — the frame used to be a `sticky top-24` child of the
 * layer, which meant that at the top of the page it painted beside row 1 no
 * matter which row was hovered: hover row 3, the picture appears three rows
 * up. It read as broken. The frame now sits at top 0 of the layer and is
 * pushed down to the active row with translate3d.
 *
 * The y comes from the row itself. Every <li> hands its element to `rows`, a
 * ref map keyed by accession ref; `measure` reads `element.offsetTop`, which
 * is already the number wanted — the <ol> is static, so a row's offsetParent
 * is the `relative` wrapper at the bottom of this file, and the layer is
 * `inset-y-0` inside that same wrapper. One coordinate space, no getBounding
 * arithmetic, no observers, no scroll listener.
 *
 * It is read at EVENT TIME, never cached at mount: a row that has been
 * expanded is taller, so every row under it has moved. Resize re-reads it too
 * — that is the only thing that shifts a row without a pointer or focus event
 * passing through `show`. The y is clamped to `layer height − frame height`
 * so a row near the end of the list cannot push the frame past the bottom of
 * the list.
 *
 * The translate rides the SAME 200ms/--ease-out transition as the fade, so
 * row-to-row now travels the frame to the row while the cover hard-cuts under
 * it — "the image comes to the row I am on". Leaving the list fades the frame
 * out where it stands and the y is deliberately LEFT THERE: resetting it
 * would either race the fade (a visible slide-away) or need a timer to wait
 * the fade out. The next `show` sets both at once, and the frame is invisible
 * in between, so a stale y is never seen.
 *
 * Because `transform` is what carries the follow, the entrance offset stays
 * on the Tailwind classes, which compile to the independent `translate` and
 * `scale` properties in v4 and compose with `transform` rather than fight it.
 * Still exactly two animated properties on this element.
 *
 * ── capability gate ──────────────────────────────────────────────────────
 *
 * The whole preview layer is gated on `(hover: hover) and (pointer: fine)`,
 * read through matchMedia rather than CSS because the gate governs whether
 * the layer MOUNTS, not merely how it paints — on a touch device the covers
 * are never requested at all. Initial state is false on both server and first
 * client render, so hydration matches and /projects still prerenders static.
 *
 * On touch, or on any pointer that cannot hover, the preview simply does not
 * appear. Nothing is lost: the preview is a picture of a project whose ref,
 * title and semester are already on the line, and opening the row gives the
 * summary, what was built, and the link out to the real thing.
 *
 * ── reduced motion ───────────────────────────────────────────────────────
 *
 * prefers-reduced-motion: reduce → the preview still appears (it is the same
 * information, and withholding it would make reduced-motion users see less),
 * but with no motion whatsoever: the transition and the translate/scale
 * classes are both dropped, so the frame is either present or absent. The
 * universal block in globals.css would already flatten the duration; this
 * removes the transform too, so nothing travels even one frame.
 *
 * The follow is unaffected — it is POSITION, not motion. With no transition
 * class the translate3d is simply where the frame is, so it appears already
 * beside the hovered row instead of sliding to it.
 */

import * as React from "react";
import Image from "next/image";

import { Expand, ExpandIcon } from "@/components/ui/expand";
import { MicroLabel } from "@/components/ui/micro-label";
import type { Project } from "@/lib/content/types";
import { cn } from "@/lib/utils";

/* The one link treatment on this page. Same class string as the /events rows
   (app/events/events-record.tsx:59-60) and the 404's route links
   (app/not-found.tsx:43) so the three do not drift. `hover:` is already
   wrapped in a pointer-capability query by Tailwind v4, so it never fires on
   touch, and the colour transition is covered by the global reduced-motion
   block. */
const LINK_CLASS =
  "inline-block rounded-control border border-line bg-surface-1 px-3 py-2 text-sm text-ink transition-colors duration-200 ease-out hover:border-line-strong";

/* ── one row ─────────────────────────────────────────────────────────────
 *
 * Its own component because it owns `open`, and a hook cannot be called from
 * a map callback. The preview handlers stay in the parent — there is still
 * exactly ONE `active`, and this row only reports pointer/focus events up.
 */
function ProjectRow({
  project,
  onShow,
  registerRow,
}: {
  project: Project;
  /** Reports "this row wants the preview" up to the single `active` owner. */
  onShow: (ref: string) => void;
  /**
   * Hands this row's <li> to the parent's ref map. The parent reads its
   * offsetTop to place the preview frame; the row itself measures nothing.
   */
  registerRow: (ref: string, element: HTMLLIElement | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const bodyId = React.useId();

  /* repo first, live second — SP-001 is a repo, SP-002/003 are live sites. A
     project carrying neither renders its body without a link. */
  const href = project.repo_url ?? project.live_url;

  /* Focus parity: a keyboard user gets the same preview a mouse user gets, so
     the image is not hover-only information. Restricted to :focus-visible so a
     mouse click on the title does not re-trigger what hover already showed.
     Unchanged from the anchor this button replaces, down to the guard. */
  const showOnFocusVisible = (event: React.FocusEvent<HTMLButtonElement>) => {
    if (event.target.matches(":focus-visible")) onShow(project.ref);
  };

  return (
    <li
      /* Braces, not a concise body: a ref callback must return a cleanup
         function or nothing, and registerRow returns void either way. */
      ref={(element) => {
        registerRow(project.ref, element);
      }}
      className="border-t border-line last:border-b"
      onPointerEnter={() => onShow(project.ref)}
    >
      {/* The right padding reserves the preview column at lg. It is a static
          reservation, not a reaction to hover, so mounting the layer never
          reflows a single line of type. */}
      <div className="py-8 lg:py-10 lg:pr-[22rem]">
        {/* `relative` anchors the stretched pseudo-element below, and it is on
            this header block rather than on the <li> deliberately: the click
            surface must cover the micro-label and the title, and must NOT lie
            over the expanded body, where it would swallow the link. */}
        <div className="relative">
          <MicroLabel as="p">
            {project.ref} · {project.term}
          </MicroLabel>

          {/* SPEC sets the index at text-4xl. That is the desktop size:
              Martian's advance is wide enough that 40px on a 360px viewport
              gives about twelve characters to the line, so the ramp steps down
              below lg. The ramp already carries -0.05em at text-4xl — the
              "heavy negative tracking" is the token, and adding
              tracking-tighter on top would only restate the same value. No
              poster face here by design. */}
          <h2 className="mt-3 text-2xl font-medium sm:text-3xl lg:text-4xl">
            {/* The title IS the trigger, so aria-expanded and aria-controls
                live here and nowhere else — not on the <li>, not on <Expand>.
                Nothing interactive is nested inside it: the only children are
                text and an aria-hidden icon, and the whole-row click surface
                is a ::after pseudo-element of this button, not a DOM node
                wrapping one. */}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => setOpen((previous) => !previous)}
              onFocus={showOnFocusVisible}
              /* Colour change only, and deliberately not transitioned — the
                 preview is the one moving thing on this page. The stretched
                 ::after is what makes hovering anywhere on the header light
                 the title, exactly as the stretched link used to. */
              className="flex w-full items-start justify-between gap-4 text-left after:absolute after:inset-0 after:content-[''] hover:text-accent-text focus-visible:text-accent-text"
            >
              {/* SPEC amendment — client, Aug 2026: the superscript
                  duplicated the accession line's year and was removed; the
                  term line is the single source. SPEC asked for both "the year
                  as a superscript" here AND "accession IDs plus semester" in
                  the micro-label above, which printed 2025 twice on every row.
                  The micro-label wins: "SP-001 · SPRING 2025" carries the
                  semester as well as the year, so it is strictly the more
                  informative of the two. */}
              <span>{project.title}</span>
              {/* The affordance. Inside the button so it inherits the hover /
                  focus-visible colour and needs no group plumbing; aria-hidden,
                  so the accessible name is the title line itself. The top
                  margin walks up with the type ramp to keep it on the cap
                  line of the first title row. */}
              <ExpandIcon
                open={open}
                className="mt-1.5 flex-none sm:mt-2.5 lg:mt-4"
              />
            </button>
          </h2>
        </div>

        {/* THE expand — components/ui/expand.tsx. Everything that used to sit
            in the collapsed row, plus what the previous revision held back. */}
        <Expand open={open} id={bodyId} className="max-w-text">
          {project.summary && (
            <p className="text-sm text-ink-muted">{project.summary}</p>
          )}

          {project.highlights.length > 0 && (
            <>
              {/* "What We Did" — app/projects/page.tsx@f4c7e1a:118
                  (pre-rewrite), the heading this same list had there.
                  MicroLabel uppercases, as it was rendered there. */}
              <MicroLabel as="p" className="mt-5 block">
                What We Did
              </MicroLabel>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-ink-muted marker:text-ink-faint">
                {project.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}

          {/* `status` is still not rendered, and expanding does not change the
              argument: it reads "completed" on all three, so a pill would
              print the same word in every body and distinguish nothing. A
              facet with one value across the whole set carries no information
              wherever you put it. It earns its place the day a project is
              in_progress. */}

          {href && (
            /* "View Project" — app/projects/page.tsx@f4c7e1a:134
               (pre-rewrite), the label on that page's own Button. */
            <p className="mt-5">
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className={LINK_CLASS}
              >
                View Project
              </a>
            </p>
          )}
        </Expand>
      </div>
    </li>
  );
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

export function ProjectIndex({ projects }: { projects: Project[] }) {
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [active, setActive] = React.useState<string | null>(null);

  /* Where the frame sits, in px down from the top of the layer. Derived from
     `active` and written in the same handler — it says WHERE, never WHICH, so
     `active` is still the only place a ref is recorded and still the only
     thing enforcing one preview at a time. */
  const [offset, setOffset] = React.useState(0);

  /* Keyed by accession ref, filled by each row's ref callback. */
  const rows = React.useRef(new Map<string, HTMLLIElement>());
  const layerRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLDivElement>(null);

  const registerRow = React.useCallback(
    (ref: string, element: HTMLLIElement | null) => {
      if (element) rows.current.set(ref, element);
      else rows.current.delete(ref);
    },
    [],
  );

  /* One layout read, at event time. `offsetTop` is measured against the
     `relative` wrapper below — the <ol> in between is static, so it is that
     wrapper that is every row's offsetParent, and the layer is inset-y-0
     inside it, so the row's offsetTop IS the frame's y with no conversion.
     The clamp keeps the frame's bottom inside the list: without it the last
     row would hang the frame off the end of the index. */
  const measure = React.useCallback((ref: string) => {
    const row = rows.current.get(ref);
    const layer = layerRef.current;
    const frame = frameRef.current;
    if (!row || !layer || !frame) return 0;

    const limit = Math.max(0, layer.offsetHeight - frame.offsetHeight);
    return Math.min(row.offsetTop, limit);
  }, []);

  /* No layer, no state changes. Reading the position here rather than in an
     effect is deliberate: a row that has been expanded is taller and has
     pushed every row below it down, so the y has to be taken at the moment
     the row asks for the preview, not at mount. */
  const show = (ref: string) => {
    if (canHover) {
      setActive(ref);
      setOffset(measure(ref));
    }
  };

  /* Resize is the one thing that moves rows without a pointer or focus event
     passing through `show`, so the row that is currently up re-reads itself.
     (An expand while that same row is up does not move its top, only the tops
     of the rows beneath it, which re-measure on their own next hover.) */
  React.useEffect(() => {
    if (!active) return;

    const remeasure = () => setOffset(measure(active));
    window.addEventListener("resize", remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, [active, measure]);

  /* Both clears live on the list, not on the row. Pointer: crossing from one
     row to the next never leaves the <ol>. Focus: React's onBlur is focusout
     and bubbles, so the relatedTarget check means tabbing down the list keeps
     the frame up and only leaving it entirely takes the frame down. Tabbing
     from an open row's title to its "View Project" link is a move within the
     <ol>, so the frame stays on that row's cover. */
  const clearOnListBlur = (event: React.FocusEvent<HTMLOListElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setActive(null);
  };

  return (
    <div className="relative">
      <ol onPointerLeave={() => setActive(null)} onBlur={clearOnListBlur}>
        {projects.map((project) => (
          <ProjectRow
            key={project.ref}
            project={project}
            onShow={show}
            registerRow={registerRow}
          />
        ))}
      </ol>

      {canHover && (
        <div
          ref={layerRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[20rem] lg:block"
        >
          {/* The frame hangs from the TOP of the layer and is pushed down to
              the active row. Nothing here is sticky any more: the reader's
              eye is on the row it is hovering, and that is where the picture
              has to be. */}
          <div
            ref={frameRef}
            /* The follow. Inline because it is a measured pixel value, and it
               composes rather than collides: Tailwind v4 compiles translate-*
               and scale-* to the independent `translate` and `scale`
               properties, so the entrance offset below keeps its tokens and
               this only carries the y. `transition` covers `transform`, so it
               rides the same 200ms / --ease-out as everything else. */
            style={{ transform: `translate3d(0, ${offset}px, 0)` }}
            className={cn(
              "absolute inset-x-0 top-0 aspect-[16/10] overflow-hidden rounded-card border border-line bg-surface-2",
              /* The only properties that change on this element are opacity
                 and transform; both are compositor-only. */
              !reduced && "transition duration-200 ease-out",
              active ? "opacity-100" : "opacity-0",
              !reduced &&
                (active
                  ? "translate-y-0 scale-100"
                  : "translate-y-2 scale-[0.98]"),
            )}
          >
            {projects.map(
              (project) =>
                project.cover && (
                  <Image
                    key={project.ref}
                    src={project.cover}
                    /* Decorative: the layer is aria-hidden and every fact in
                       it is already on the row. */
                    alt=""
                    fill
                    sizes="320px"
                    className={cn(
                      "object-cover",
                      active === project.ref ? "opacity-100" : "opacity-0",
                    )}
                  />
                ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
