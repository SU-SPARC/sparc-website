"use client";

/* Footer — one horizontal band at a locked height, plus a strip.
 *
 *   [mark] [SPARC + tagline] ......... [About & team · Projects · Events ·
 *                                       Join │ icons]
 *
 * Translated from design/footer-v9.html. That file's custom property names
 * drifted from the token layer (see the correction table in
 * design/COMPONENTS.md) and none of them exist; the real semantic tokens are
 * used here. Its base64 photo blob is not copied either — the mask reads the
 * .webp already in public/images.
 *
 * It is a client component because it measures: the wordmark is sized from
 * the poster face's INK, which only the browser can report.
 *
 * No theme switcher here. That control belongs in the nav.
 */

import Link from "next/link";
import * as React from "react";
import { FaDiscord, FaEnvelope, FaGithub, FaLinkedin } from "react-icons/fa";

import { MicroLabel } from "@/components/ui/micro-label";
import { SparcMark } from "@/components/ui/sparc-mark";

const LINKS = [
  { href: "/about", label: "About & team" },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
  { href: "/join", label: "Join" },
];

/* Every destination is one already present in the repo: the first three come
   from the footer this file replaces, GitHub from app/contact/page.tsx. */
const SOCIALS = [
  {
    href: "https://www.linkedin.com/company/suffolk-programming-ai-research-club",
    label: "SPARC on LinkedIn",
    Icon: FaLinkedin,
  },
  { href: "https://discord.gg/W8veDYAku6", label: "SPARC on Discord", Icon: FaDiscord },
  { href: "https://github.com/SU-SPARC", label: "SPARC on GitHub", Icon: FaGithub },
  {
    href: "mailto:sparc@studentorgs.suffolk.edu",
    label: "Email SPARC",
    Icon: FaEnvelope,
  },
];

const EMAIL = "sparc@studentorgs.suffolk.edu";

/* globals.css exposes the width axis as a token but no utility for it. */
const WIDTH_NORMAL: React.CSSProperties = {
  fontVariationSettings: '"wdth" var(--wdth-normal)',
};

/* One span per letter so each can carry its own photo. Mapped from an array
   rather than written out as five sibling tags: JSX would put a whitespace
   text node between hand-written siblings, and a space inside the wordmark
   would both widen it past the measured width and read as "S P A R C". The
   paragraph's text content is still exactly "SPARC", so no aria is needed —
   inline spans do not break the text run for a screen reader. */
const WORDMARK = ["S", "P", "A", "R", "C"];

/* The three things Tailwind cannot express, and nothing else.
 *
 * 1. --sparc-foot-h. One number drives the band. It is component layout, not
 *    a design token, so it is declared here rather than in globals.css.
 *    Below ~112px the tagline starts crowding the wordmark and should move
 *    down to the strip; 120px is the tested default.
 *
 * 2. The photo mask — one photo per letter. `background-clip: text` still
 *    wants the -webkit- prefix for older Safari, and the whole thing has to
 *    sit inside @supports so that the FAILURE MODE IS A SOLID ACCENT
 *    WORDMARK, never invisible text — which is why `color` is set to the
 *    accent on the base rule and only turned transparent inside the
 *    @supports block. background-color is repeated inside that block, on
 *    every letter, for the same reason one level down: it is clipped to the
 *    glyphs like every other background layer, so a letter whose photo 404s
 *    or fails to cover its box renders solid accent instead of nothing.
 *
 *    Why five photos. The old mask ran ONE frame of sparc-vc-4 across the
 *    whole word at zoom 500%, and the slice that landed inside the glyphs was
 *    mostly whiteboard, ceiling and a pale wall — near-white ink on a
 *    near-white band. That is the "SPARC is hard to read" the club reported.
 *    Splitting the word gives every letter a frame chosen for its own tonal
 *    shape instead of one crop chosen for the average.
 *
 *    THE BLEND IS THE LEGIBILITY GUARANTEE, not a taste call. Each letter is
 *    a photo over `background-color: var(--color-accent)` with
 *    background-blend-mode: multiply on light, screen on dark. multiply can
 *    only take a pixel DARKER than the accent; screen can only take it
 *    LIGHTER. So on the near-white light band and the near-black dark band
 *    alike, the photo can never push a letter toward the surface behind it,
 *    and the worst case a letter can reach is exactly solid accent — the same
 *    floor the @supports fallback lands on. luminosity was tried and
 *    rejected: it passes photo lightness straight through, so a white wall or
 *    a lit screen inside a glyph goes white and the letter opens up again,
 *    which is the bug being fixed. That is also why the frames below are the
 *    bright, evenly lit ones: under multiply only genuinely near-white pixels
 *    stay accent-coloured, so a dim room (sparc-1, sparc-2) crushes the whole
 *    letter to near-black and loses the accent family.
 *
 *      1 S  sparc-vc-1   a member's face, laptop screens and a red chair
 *      2 P  sparc-vc-6   two members shoulder to shoulder, white wall behind
 *      3 A  sparc-vc-11  whiteboard above two members at their laptops
 *      4 R  sparc-vc-7   a member in profile, hands on the keyboard
 *      5 C  sparc-vc-4   the whole club, back row above the monitors
 *
 *    RETUNING. Each letter has four variables and nothing else: -img -zoom
 *    -x -y. -img is the frame, -zoom is background-size (100% = the frame
 *    exactly as tall as the letter box; bigger crops in closer), and -x/-y
 *    are background-position, which at these zooms sit roughly on the point
 *    of the frame you want in the middle of the letter. Zoom is per letter
 *    because the frames are not shot from the same distance. One rule when
 *    changing -img or -zoom: keep
 *
 *      zoom x 1.283 x (frame width / frame height)  >=  the letter's advance
 *
 *    (advance in em: S .734, P .811, A .804, R .875, C .789; 1.283 is Ultra's
 *    inline box height in em). Below that the scaled frame is narrower than
 *    the glyph and the uncovered part falls back to flat accent. Every letter
 *    below clears it with room to spare.
 *
 * 3. The pre-hydration font-size. 0.72 x the band height is what the
 *    measurement below resolves to at the default 120px, so the server paint
 *    and the measured paint agree and there is no jump; at any other height
 *    the effect corrects it after mount.
 */
const FOOTER_CSS = `
.sparc-footer{
  --sparc-foot-h:120px;

  /* ── Wordmark tuning. Four variables per letter, S P A R C in order; see
        the RETUNING note above before changing -img or -zoom. ─────────── */
  --sparc-mask-1-img:url("/images/sparc-vc-1.webp");
  --sparc-mask-1-zoom:380%;
  --sparc-mask-1-x:22%;
  --sparc-mask-1-y:50%;

  --sparc-mask-2-img:url("/images/sparc-vc-6.webp");
  --sparc-mask-2-zoom:170%;
  --sparc-mask-2-x:42%;
  --sparc-mask-2-y:62%;

  --sparc-mask-3-img:url("/images/sparc-vc-11.webp");
  --sparc-mask-3-zoom:340%;
  --sparc-mask-3-x:8%;
  --sparc-mask-3-y:40%;

  --sparc-mask-4-img:url("/images/sparc-vc-7.webp");
  --sparc-mask-4-zoom:240%;
  --sparc-mask-4-x:28%;
  --sparc-mask-4-y:52%;

  --sparc-mask-5-img:url("/images/sparc-vc-4.webp");
  --sparc-mask-5-zoom:220%;
  --sparc-mask-5-x:40%;
  --sparc-mask-5-y:60%;

  /* Photo over accent: darken-only on a light band. */
  --sparc-mask-blend:multiply;
}
/* Lighten-only on a dark one — same guarantee, other direction. Mirrors the
   dark variant globals.css declares, which covers .dim as well. */
:where(.dark, .dim) .sparc-footer{
  --sparc-mask-blend:screen;
}
/* .light is a FORCING class (globals.css), and that contract has to be
   mirrored by component-local theme variables too: without this rule a
   .light container nested inside a dark page inherits screen from the
   rule above. Found by /preview's side-by-side theme columns — the exact
   nesting the live site never produces but the specimen page always does. */
:where(.light) .sparc-footer{
  --sparc-mask-blend:multiply;
}
.sparc-footer-word{
  font-size:calc(var(--sparc-foot-h) * 0.72);
  color:var(--color-accent);
}
/* Ultra kerns P|A by -0.0391em, and the fit below clamps the wordmark against
   a canvas measureText("SPARC") that includes that kern. Text shaping is not
   guaranteed to cross element boundaries, so five spans can lose the pair and
   render 0.039em WIDER than the number the clamp trusts — on a phone, where
   the clamp is the only thing keeping the wordmark inside the band, that puts
   the C under the overflow clip. So the kern is restored by hand here.

   Measured, not assumed: Blink does shape across the boxes and re-applies the
   pair itself when nothing separates the spans, but a margin suppresses that,
   and this margin is exactly the value it would have applied — so the width
   comes out the same either way (334.27px vs 334.23px for the old single text
   node at the 120px default). The point of declaring it is that an engine
   which does NOT shape across boxes lands on the same width instead of
   overflowing, and the error can only ever run narrow, never wide.

   Outside @supports on purpose: this is layout, not decoration, so the
   fallback wordmark is the same width as the photo one. */
.sparc-footer-word > span:nth-child(2){
  margin-right:-0.0391em;
}
@supports ((-webkit-background-clip:text) or (background-clip:text)){
  .sparc-footer-word > span{
    background-color:var(--color-accent);
    background-repeat:no-repeat;
    background-blend-mode:var(--sparc-mask-blend);
    -webkit-background-clip:text;
    background-clip:text;
    color:transparent;
    -webkit-text-fill-color:transparent;
  }
  .sparc-footer-word > span:nth-child(1){
    background-image:var(--sparc-mask-1-img);
    background-size:auto var(--sparc-mask-1-zoom);
    background-position:var(--sparc-mask-1-x) var(--sparc-mask-1-y);
  }
  .sparc-footer-word > span:nth-child(2){
    background-image:var(--sparc-mask-2-img);
    background-size:auto var(--sparc-mask-2-zoom);
    background-position:var(--sparc-mask-2-x) var(--sparc-mask-2-y);
  }
  .sparc-footer-word > span:nth-child(3){
    background-image:var(--sparc-mask-3-img);
    background-size:auto var(--sparc-mask-3-zoom);
    background-position:var(--sparc-mask-3-x) var(--sparc-mask-3-y);
  }
  .sparc-footer-word > span:nth-child(4){
    background-image:var(--sparc-mask-4-img);
    background-size:auto var(--sparc-mask-4-zoom);
    background-position:var(--sparc-mask-4-x) var(--sparc-mask-4-y);
  }
  .sparc-footer-word > span:nth-child(5){
    background-image:var(--sparc-mask-5-img);
    background-size:auto var(--sparc-mask-5-zoom);
    background-position:var(--sparc-mask-5-x) var(--sparc-mask-5-y);
  }
}
`;

const Footer = () => {
  const slotRef = React.useRef<HTMLDivElement>(null);
  const wordRef = React.useRef<HTMLParagraphElement>(null);

  /* Ink-bounds auto-fit — design/COMPONENTS.md "Ultra needs .poster, always".
   *
   * Ultra's em box is not its ink: sizing the wordmark by the em box leaves
   * the caps floating, and bottom-aligning by ink clips them (13px of clip at
   * 74px available, which is why the demo exists). So measure the real ink
   * with canvas, size from that, then translate the baseline into place.
   *
   * The .poster class has already trimmed the box with negative margins, so
   * the correction is measured against the margin the browser actually
   * computed rather than assumed — that keeps the alignment honest while
   * Ultra is still loading and the fallback face is on screen.
   *
   * Runs in an effect only: canvas and getComputedStyle do not exist on the
   * server, and the server paint is a visible accent wordmark either way. */
  React.useEffect(() => {
    const slot = slotRef.current;
    const word = wordRef.current;
    if (!slot || !word) return;

    const fit = () => {
      const avail = slot.clientHeight;
      if (avail <= 0) return;

      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return;

      const probe = 200;
      const family = getComputedStyle(word).fontFamily;
      if (!family) return;
      ctx.font = `400 ${probe}px ${family}`;

      const m = ctx.measureText("SPARC");
      const a = m.actualBoundingBoxAscent / probe; // ink above the baseline
      const d = m.actualBoundingBoxDescent / probe; // ink below it
      const ink = a + d;
      /* Old engines report no actualBoundingBox*. Leaving the CSS size in
         place is the right failure: it is visible and roughly right. */
      if (!Number.isFinite(ink) || ink <= 0) return;

      const fA = (m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent) / probe;
      const fD = (m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent) / probe;

      const pad = 1;
      let size = (avail - pad * 2) / ink;

      /* Height is the usual constraint, but not on a phone: the tagline
         beside it wraps, the column narrows, and a height-fitted wordmark
         would run out past the band's clip. measureText's advance scales
         linearly, so one comparison catches it. */
      const availW = slot.clientWidth;
      const widthAtSize = (m.width / probe) * size;
      if (availW > 0 && widthAtSize > availW) size *= availW / widthAtSize;

      word.style.fontSize = `${size}px`;

      /* Where the ink currently starts, in slot coordinates: the .poster
         trim (a negative margin, in px now that the size is set) plus the
         baseline's offset inside the line box, minus the ascent. */
      const marginTop = parseFloat(getComputedStyle(word).marginTop) || 0;
      const baselineInBox = size * ((1 - fA - fD) / 2 + fA);
      const inkTop = marginTop + baselineInBox - a * size;
      /* Equals `pad` in the height-limited case and centres the leftover
         when the width clamp above shrank the type. */
      const top = (avail - size * ink) / 2;
      word.style.transform = `translateY(${top - inkTop}px)`;
    };

    fit();

    /* The slot changes height when the band collapses at a breakpoint or the
       tagline rewraps; the face swap changes the ink without changing the
       slot, so both triggers are needed. */
    const ro = new ResizeObserver(fit);
    ro.observe(slot);

    let live = true;
    document.fonts?.ready.then(() => {
      if (live) fit();
    });

    return () => {
      live = false;
      ro.disconnect();
    };
  }, []);

  return (
    <footer className="sparc-footer border-t border-line bg-surface">
      <style>{FOOTER_CSS}</style>

      <div className="mx-auto max-w-page px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-5 overflow-hidden rounded-card bg-surface-1 px-6 py-4 xl:h-[var(--sparc-foot-h)] xl:flex-nowrap xl:gap-6">
          {/* The mark tracks the band height, and stays solid accent: a photo
              fill inside a 13.6-unit stroke reads as noise. */}
          <SparcMark className="h-16 w-auto shrink-0 text-accent sm:h-[84px] xl:h-full" />

          {/* Not shrink-0: on a phone the tagline wraps and this column has
              to give, or the band clips it. The wordmark follows, because
              the fit below is clamped by this column's width as well as its
              height. Taller box below sm to buy back the wrapped lines. */}
          <div className="flex h-24 min-w-0 flex-1 flex-col justify-center gap-1 sm:h-[84px] xl:h-full">
            <div ref={slotRef} className="relative min-h-0 flex-1 overflow-hidden">
              {/* Ultra, and therefore .poster — see globals.css. */}
              <p
                ref={wordRef}
                className="sparc-footer-word poster absolute left-0 top-0 whitespace-nowrap"
              >
                {WORDMARK.map((letter) => (
                  <span key={letter}>{letter}</span>
                ))}
              </p>
            </div>
            <MicroLabel
              as="p"
              className="shrink-0 whitespace-normal sm:whitespace-nowrap"
            >
              Suffolk Programming, AI &amp; Research Club
            </MicroLabel>
          </div>

          <div className="flex w-full flex-col items-start gap-3.5 sm:flex-row sm:items-center sm:gap-5 xl:ml-auto xl:w-auto">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="border-b border-transparent pb-[3px] text-sm text-ink transition-colors hover:border-accent hover:text-accent-text"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* A hairline, not a gap: "these are a different kind of link". */}
            <ul className="flex items-center gap-2 sm:border-l sm:border-line sm:pl-5">
              {SOCIALS.map(({ href, label, Icon }) => (
                <li key={href}>
                  {/* bg-chip / border-chip-line are theme-constant dark — that
                      is what those two tokens exist for — so the glyph cannot
                      come off the neutral ramp, which would invert with the
                      theme and vanish into the tile. text-surface is the light
                      end on light, text-ink is the light end on dark and dim;
                      both clear 13:1 here. .lift carries the -2px hover and is
                      capability-gated in globals.css. */}
                  <a
                    href={href}
                    aria-label={label}
                    {...(href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="lift grid size-8 place-items-center rounded-control border border-chip-line bg-chip text-surface transition-colors hover:border-accent hover:bg-accent hover:text-on-accent dark:text-ink"
                  >
                    <Icon aria-hidden className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Strip. Room and email only — the demo's "Suffolk University …
            Boston MA" line has no source in the repo, so it is not invented
            back. "73 Tremont, Room 8065" is the repo's room string with the
            comma the data form omits. */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-1">
          <MicroLabel as="p">73 Tremont, Room 8065</MicroLabel>
          <a
            href={`mailto:${EMAIL}`}
            className="text-label text-ink-muted transition-colors hover:text-accent-text"
            style={WIDTH_NORMAL}
          >
            {EMAIL}
          </a>
          {/* ink-muted, not ink-faint: this is 13px text, so it owes 4.5:1
              and ink-faint does not clear it — see micro-label.tsx. */}
          <p className="w-full text-label text-ink-muted" style={WIDTH_NORMAL}>
            {`© ${new Date().getFullYear()} SPARC. All rights reserved.`}
          </p>
          {/* "Designed by Allan Nguyen" — client instruction, Aug 2026,
              verbatim. Plain text, not a link: the client asked for the
              credit, not for a destination. If the club ever wants it
              linked, the URL is already in the repo —
              lib/content/members.ts:139, https://www.allandng.com/. Same
              classes as the © line above so the two read as one block. */}
          <p className="w-full text-label text-ink-muted" style={WIDTH_NORMAL}>
            Designed by Allan Nguyen
          </p>
        </div>
      </div>
    </footer>
  );
};

export { Footer };
