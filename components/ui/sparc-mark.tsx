/* SparcMark — the logo, inline. Server-safe, no state, no motion.
 *
 * Translated from public/logo/sparc-mark.svg. It is inline rather than an
 * <img>/next/Image because three things need to reach inside it:
 *   - the theme (currentColor, so the mark tracks text-accent per theme),
 *   - S4's hero travel, which addresses #bolt-up / #bolt-dn / #arc / #nodes,
 *   - the mask, which cannot be recoloured from outside a raster.
 *
 * STRUCTURE IS LOAD-BEARING — do not "simplify" it:
 *   #arc is a stroked centreline (that is what makes a stroke-dashoffset
 *   draw-on possible), and the two bolts are painted through mask #cut-m,
 *   which punches a wider stroke (37.6) along the same centreline as the
 *   visible arc (13.6). Without that knockout the arc merges into the lower
 *   bolt below ~48px. Because both strokes are driven from the same path
 *   data below, the knockout keeps scaling with the arc — see
 *   design/COMPONENTS.md "The logo".
 *
 * Colour: currentColor throughout, so callers set it with text-accent (or any
 * ink token) and every theme follows. The only literal colours in this file
 * are #fff / #000 inside <mask>, and those are NOT visible colour — a mask's
 * luminance is its alpha channel, so they are 100%/0% opacity written the
 * only way SVG masks accept. They are exempt from the no-hex rule for that
 * reason, and they are the reason nothing here may be tokenised.
 *
 * Ids are global to the document, so rendering this component more than once
 * per page (nav + footer, and later the hero) repeats id="cut-m" and friends.
 * That is deliberate and required by the S4 contract: the ids must stay
 * exactly these. Every copy defines the identical mask, so url(#cut-m)
 * resolving to the first one paints the same result. Anything scripting a
 * specific instance must scope its lookup to that instance's container —
 * e.g. querySelector('[data-nav-mark] #bolt-up') — never getElementById.
 */

import * as React from "react";

/* The arc's three centreline segments and the two nodes, declared once and
   stroked twice: at 37.6 into the mask (the knockout) and at 13.6 as the
   visible arc. Verbatim from public/logo/sparc-mark.svg. */
const ARC_SEGMENTS = [
  "M529 199C523 209 510 241 497 262C484 283 468 305 453 326C437 346 420 365 403 383C385 401 367 418 347 436C327 454 303 473 281 489C259 506 238 521 215 536C191 551 164 567 143 579C121 591 94 602 84 607",
  "M374 278C376 276 383 270 388 265C393 261 399 255 405 250C410 246 415 241 421 236C427 231 433 226 439 221C445 216 452 211 458 207C464 202 469 199 475 195C481 190 489 186 494 182C500 178 507 175 509 173",
  "M121 504C119 505 114 510 111 513C107 516 105 520 101 524C98 527 96 531 93 534C89 538 86 543 83 547C79 551 77 554 74 558C71 561 69 565 67 568C64 572 62 575 59 579C57 582 54 587 53 588",
];

const NODES = [
  { cx: 541, cy: 154, r: 18 },
  { cx: 40, cy: 622, r: 18 },
];

const BOLT_UP =
  "M378 0L0 499L254 488L304 450L356 405L398 363L441 312L307 312Z";
const BOLT_DN =
  "M566 312L485 313L434 376L377 434L306 494L237 544L161 855L373 566Z";

export interface SparcMarkProps {
  className?: string;
  /** Defaults to true: every current caller renders visible "SPARC" text
   *  beside it, so the mark is decorative. Pass false only if you also give
   *  the svg an accessible name. */
  "aria-hidden"?: boolean;
}

export function SparcMark({
  className,
  "aria-hidden": ariaHidden = true,
}: SparcMarkProps) {
  return (
    <svg
      viewBox="0 0 572 856"
      fill="none"
      aria-hidden={ariaHidden}
      focusable="false"
      className={className}
    >
      <defs>
        {/* Mask colours are alpha, not paint — see the file header. */}
        <mask
          id="cut-m"
          maskUnits="userSpaceOnUse"
          x={-40}
          y={-40}
          width={652}
          height={936}
        >
          <rect x={-40} y={-40} width={652} height={936} fill="#fff" />
          <g stroke="#000" strokeWidth={37.6} strokeLinecap="round" fill="none">
            {ARC_SEGMENTS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g stroke="#000" strokeWidth={37.6} fill="none">
            {NODES.map((n) => (
              <circle key={`${n.cx}-${n.cy}`} cx={n.cx} cy={n.cy} r={n.r} />
            ))}
          </g>
        </mask>
      </defs>

      <g mask="url(#cut-m)">
        <path id="bolt-up" fill="currentColor" d={BOLT_UP} />
        <path id="bolt-dn" fill="currentColor" d={BOLT_DN} />
      </g>

      <g
        id="arc"
        stroke="currentColor"
        strokeWidth={13.6}
        strokeLinecap="round"
        fill="none"
      >
        {ARC_SEGMENTS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      <g id="nodes" stroke="currentColor" strokeWidth={13.6} fill="none">
        {NODES.map((n) => (
          <circle key={`${n.cx}-${n.cy}`} cx={n.cx} cy={n.cy} r={n.r} />
        ))}
      </g>
    </svg>
  );
}
