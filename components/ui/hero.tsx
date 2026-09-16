"use client";

/* Hero — orbit draw, then bolt travel. SPEC "Home / Hero" verbatim.
 *
 * Two motions, deliberately different mechanisms:
 *
 *   ENTRANCE (time-based, plays once on load)
 *     bolt halves rise 80ms apart → the arc draws by stroke-dashoffset →
 *     the nodes land → one ring fires at each node. WAAPI, not keyframes:
 *     the no-keyframes rule in SPEC guards *reversibility* of scroll-linked
 *     motion, and this is not scroll-linked. Every animation is declared
 *     with `fill: "backwards"` and ends on the element's NATURAL state, so
 *     the from-state applies before first paint (this effect is a layout
 *     effect) and nothing is left inline afterwards. Without JS the mark
 *     simply renders finished, which is the correct failure.
 *
 *   TRAVEL (scroll-linked, reversible)
 *     One persistent node — [data-hero-mark], carried by a `position:
 *     sticky` stage — is transformed from its hero size into the nav slot.
 *     transform + opacity only. Two paths, feature-detected:
 *       · CSS.supports('animation-timeline: scroll()') → a generated
 *         @keyframes + `animation-timeline: scroll(root block)` with an
 *         `animation-range` in measured scroll offsets, so the browser
 *         drives the transform off the main thread.
 *       · otherwise → the same numbers written by one rAF as one transform
 *         string.
 *     Both paths compute from ONE measurement pass, redone on resize only,
 *     because [data-nav-mark] is position-stable by construction (see the
 *     header of navbar.tsx).
 *
 * WHY THE WHOLE MARK TRAVELS, NOT ONLY THE TWO BOLT PATHS.
 * SPEC says "only the bolt travels", in contrast with the wordmark and the
 * tagline, which stay behind and fade. Taken literally against the real
 * artwork it cannot be right: the landing target is the nav *mark*, whose
 * own copy is held at opacity 0 while the traveller is in flight, so a
 * traveller carrying only #bolt-up/#bolt-dn would land as a bolt with no
 * arc and no nodes, and the arc would then have to pop in — the exact
 * two-element cross-fade SPEC forbids two bullets later. Flying the whole
 * SparcMark makes the landing pixel-identical to what the nav renders on
 * every other page, and keeps "only the bolt travels" true in the sense
 * that matters: nothing else in the hero moves.
 *
 * THE NAV CONTRACT. This component writes `opacity` (inline) to
 * [data-nav-mark] and [data-nav-wordmark] and nothing else — no geometry,
 * no classes, no other element — and only while it is mounted and motion
 * is not reduced. Both are restored to "" in every cleanup path. Under
 * reduced motion the nav is not touched at all.
 */

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { MicroLabel } from "@/components/ui/micro-label";
import { PosterText } from "@/components/ui/poster-text";
import { SparcMark } from "@/components/ui/sparc-mark";

/* ── handshake with photo-drift ───────────────────────────────────────
 * SPEC: "The hero and the drift must not both be moving at once." The
 * drift's IntersectionObserver already guarantees that in practice — the
 * photo band sits a full viewport below — but a fast flick on a short
 * screen could beat the ~2s entrance, so the drift also waits on this.
 *
 * Default true so that a page with no <Hero> (the drift is reusable) never
 * waits on something that will not arrive. */
let settled = true;
const waiting = new Set<() => void>();

function setSettled(next: boolean) {
  settled = next;
  if (!next) return;
  const pending = [...waiting];
  waiting.clear();
  for (const cb of pending) cb();
}

/** Runs `cb` once the hero's entrance has finished (immediately if there is
 *  no hero, or if it has already settled). Returns an unsubscribe. */
export function onHeroSettled(cb: () => void): () => void {
  if (settled) {
    cb();
    return () => {};
  }
  waiting.add(cb);
  return () => {
    waiting.delete(cb);
  };
}

/* ── entrance timing (ms) ─────────────────────────────────────────────
 * Staggers stay inside the 30–80ms band; 80ms between the bolt halves is
 * SPEC's own number. */
const BOLT_MS = 560;
const BOLT_STAGGER = 80;
const BOLT_RISE = 130; // user units of the 572×856 viewBox, so it scales
const ARC_AT = [300, 700, 760];
const ARC_MS = [760, 320, 320];
const NODE_AT = [900, 980];
const NODE_MS = 420;
const RING_AT = [1180, 1260];
const RING_MS = 700;

/* ── travel mapping ───────────────────────────────────────────────────
 * LEAD is dead scroll at the head of the track: SPEC wants the wordmark and
 * tagline gone "before any movement starts", and their fade is 150ms, so
 * the bolt holds still for the first slice of the track rather than racing
 * the fade. WORDMARK_IN is SPEC's ~80%. */
const LEAD = 0.14;
const WORDMARK_IN = 0.8;

const HERO_CSS = `
.sparc-hero{
  /* 4rem is navbar.tsx's fixed h-16 row. The travel maths does not trust
     this value — it reads the sticky offset back from the computed style —
     but the first screen only looks right if the stage starts under the
     header. */
  --sparc-hero-top:4rem;
  --sparc-hero-travel:58svh;
  position:relative;
  height:calc(100svh - var(--sparc-hero-top) + var(--sparc-hero-travel));
}
.sparc-hero-stage{
  position:sticky;
  top:var(--sparc-hero-top);
  height:calc(100svh - var(--sparc-hero-top));
  /* Above the header's z-50: the traveller has to paint over the nav bar as
     it lands in it. Sticky with z-index makes a stacking context, and this
     one sorts above the header. */
  z-index:60;
  /* Painting above the nav must not mean eating its clicks.
     The stage is a transparent, full-width sheet over the whole first
     screen, and hit-testing follows paint order — so at z-60 it took the
     mousedown for anything the nav hangs into that screen. The theme
     panel is exactly that: absolutely positioned under the header row at
     z-50, so its options were unreachable and the toggle's own
     outside-click handler read the swallowed mousedown as "outside" and
     closed it. Measured: 0/21 theme switches at scroll 0 on home, 21/21
     on every other page. Reduced motion included — this block is static.
     Found through the theme toggle, but it applied to anything the first
     viewport covers, so the fix is at the stage, not at that control. */
  pointer-events:none;
}
/* ...and given back to the one thing in here anyone clicks or reads. It
   holds the kicker, wordmark, tagline and CTA, and nothing of the nav's
   ever reaches this far down the screen, so restoring the whole box keeps
   the copy selectable instead of only the link clickable. The traveller
   deliberately does NOT get it back: it is decorative, and it ends the
   travel sitting exactly on top of the nav's real home link. */
.sparc-hero-copy{
  pointer-events:auto;
}
/* Faded out is not interactive. After the first scroll the copy is at
   opacity 0, and opacity 0 still hit-tests. */
.sparc-hero-copy[data-gone]{
  pointer-events:none;
}
.sparc-hero-mark{
  transform-origin:50% 50%;
  will-change:transform;
}
`;

type Measurement = {
  travel: number;
  stickyTop: number;
  dx: number;
  dy: number;
  scale: number;
};

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

const useIsoLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function Hero() {
  const trackRef = React.useRef<HTMLElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const slotRef = React.useRef<HTMLDivElement>(null);
  const markRef = React.useRef<HTMLDivElement>(null);
  const copyRef = React.useRef<HTMLDivElement>(null);
  const ringLayerRef = React.useRef<SVGSVGElement>(null);
  const travelCssRef = React.useRef<HTMLStyleElement>(null);

  /* Re-runs the whole effect when the user flips the OS setting, so the
     cleanup below restores the nav on the way into reduced motion. */
  const [motionEpoch, setMotionEpoch] = React.useState(0);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMotionEpoch((n) => n + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useIsoLayoutEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const slot = slotRef.current;
    const mark = markRef.current;
    const copy = copyRef.current;
    if (!track || !stage || !slot || !mark || !copy) return;

    /* Reduced motion: no entrance, no travel, no nav writes. The mark
       renders finished, the copy stays put, and the nav shows its own mark
       and wordmark exactly as it does on every other page. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ease =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--ease-out")
        .trim() || "ease-out";

    /* ── entrance ───────────────────────────────────────────────────── */
    setSettled(false);
    const anims: Animation[] = [];
    const play = (
      el: Element,
      frames: Keyframe[],
      opts: KeyframeAnimationOptions,
    ) => {
      anims.push(el.animate(frames, { fill: "backwards", easing: ease, ...opts }));
    };

    /* Ids repeat per page (nav + footer + here), so every lookup is scoped
       to this instance — never getElementById. See sparc-mark.tsx. */
    const bolts = [
      mark.querySelector("#bolt-up"),
      mark.querySelector("#bolt-dn"),
    ];
    bolts.forEach((bolt, i) => {
      if (!bolt) return;
      play(
        bolt,
        [
          { transform: `translateY(${BOLT_RISE}px)`, opacity: 0 },
          { transform: "translateY(0px)", opacity: 1 },
        ],
        { duration: BOLT_MS, delay: i * BOLT_STAGGER },
      );
    });

    /* The mask carries a second copy of the arc and the nodes at stroke
       width 37.6 — it is what knocks the arc out of the bolts. Drawing only
       the visible arc would leave that groove cut into the bolts from the
       first frame, so the knockout draws on the same clock. */
    const arcs = mark.querySelectorAll<SVGPathElement>("#arc path");
    const maskArcs = mark.querySelectorAll<SVGPathElement>("mask path");
    arcs.forEach((path, i) => {
      const len = path.getTotalLength();
      if (!len) return;
      const frames: Keyframe[] = [
        { strokeDasharray: `${len}`, strokeDashoffset: `${len}` },
        { strokeDasharray: `${len}`, strokeDashoffset: "0" },
      ];
      const opts = { duration: ARC_MS[i] ?? 400, delay: ARC_AT[i] ?? 300 };
      play(path, frames, opts);
      const knockout = maskArcs[i];
      if (knockout) play(knockout, frames, opts);
    });

    const nodes = mark.querySelectorAll<SVGCircleElement>("#nodes circle");
    const maskNodes = mark.querySelectorAll<SVGCircleElement>("mask circle");
    const ringLayer = ringLayerRef.current;
    const markSvg = mark.querySelector("svg");
    if (ringLayer && markSvg) {
      /* The ring layer copies its coordinate system off the mark rather
         than restating it, so it cannot drift out of sync with
         sparc-mark.tsx. */
      const viewBox = markSvg.getAttribute("viewBox");
      if (viewBox) ringLayer.setAttribute("viewBox", viewBox);
    }
    const rings = ringLayer
      ? ringLayer.querySelectorAll<SVGCircleElement>("circle")
      : ([] as unknown as NodeListOf<SVGCircleElement>);

    nodes.forEach((node, i) => {
      const cx = node.getAttribute("cx") ?? "0";
      const cy = node.getAttribute("cy") ?? "0";
      const r = node.getAttribute("r") ?? "18";
      /* transform-origin travels in the keyframes so nothing is left on the
         element once the animation is done. SVG's default transform-box is
         view-box, so these are user units. */
      const origin = `${cx}px ${cy}px`;
      const frames: Keyframe[] = [
        { transform: "scale(0.35)", transformOrigin: origin, opacity: 0 },
        { transform: "scale(1)", transformOrigin: origin, opacity: 1 },
      ];
      const opts = { duration: NODE_MS, delay: NODE_AT[i] ?? 900 };
      play(node, frames, opts);
      const knockout = maskNodes[i];
      if (knockout) play(knockout, frames, opts);

      const ring = rings[i];
      if (!ring) return;
      ring.setAttribute("cx", cx);
      ring.setAttribute("cy", cy);
      ring.setAttribute("r", r);
      /* Stroke thins as the ring grows, so the ripple does not fatten into
         a blob at 3x. Its natural state is opacity 0 (the attribute in the
         JSX below), which is where fill:"backwards" leaves it. */
      play(
        ring,
        [
          {
            transform: "scale(0.55)",
            transformOrigin: origin,
            strokeWidth: 13.6,
            opacity: 0.85,
          },
          {
            transform: "scale(3)",
            transformOrigin: origin,
            strokeWidth: 4.5,
            opacity: 0,
          },
        ],
        { duration: RING_MS, delay: RING_AT[i] ?? 1180 },
      );
    });

    let live = true;
    /* allSettled, not all: a cancelled animation rejects .finished. */
    void Promise.allSettled(anims.map((a) => a.finished)).then(() => {
      if (live) setSettled(true);
    });

    /* ── travel ─────────────────────────────────────────────────────── */
    const navMark = document.querySelector<HTMLElement>("[data-nav-mark]");
    const navWordmark =
      document.querySelector<HTMLElement>("[data-nav-wordmark]");

    const measure = (): Measurement | null => {
      if (!navMark) return null;
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      const stageRect = stage.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      const navRect = navMark.getBoundingClientRect();
      if (!slotRect.height || !navRect.height) return null;

      /* Rects, not offsetHeight. The track is 100svh − 4rem + 58svh and the
         stage is the first two of those, so the difference is fractional at
         most viewport heights; offsetHeight rounds both to whole pixels and
         the error lands entirely on the last pixel of the track, where the
         stage is already being pushed off its sticky offset. Measured: 0.48px
         of miss at 390×844, 0 after this. */
      const travel = track.getBoundingClientRect().height - stageRect.height;
      if (travel <= 0) return null;

      /* The slot is the untransformed twin of the traveller, so it is safe
         to measure mid-flight. Its resting viewport position is expressed
         through the stage's stuck offset rather than read raw, so the
         numbers do not depend on where the page happens to be scrolled. */
      const restX = slotRect.left + slotRect.width / 2;
      const restY =
        stickyTop + (slotRect.top - stageRect.top) + slotRect.height / 2;

      return {
        travel,
        stickyTop,
        dx: navRect.left + navRect.width / 2 - restX,
        dy: navRect.top + navRect.height / 2 - restY,
        /* Both marks are the same artwork at the same aspect, so one ratio
           lands width and height together. ~0.18 at 1440, never smaller. */
        scale: navRect.height / slotRect.height,
      };
    };

    const transformAt = (m: Measurement, p: number) =>
      `translate3d(${(m.dx * p).toFixed(3)}px, ${(m.dy * p).toFixed(3)}px, 0) scale(${(1 + (m.scale - 1) * p).toFixed(5)})`;

    /* CSS scroll-driven path. The nav's two opacities cannot join it — the
       contract allows inline transform/opacity on those elements and
       nothing else — so the rAF below runs either way and this only takes
       over the one expensive property. */
    const supportsScrollTimeline =
      typeof CSS !== "undefined" &&
      CSS.supports("animation-timeline: scroll()");
    let cssDriven = false;

    const clearCss = () => {
      cssDriven = false;
      if (travelCssRef.current) travelCssRef.current.textContent = "";
    };

    const installCss = (m: Measurement) => {
      const sheet = travelCssRef.current;
      if (!sheet) return;
      const startsAt = Math.max(
        0,
        track.getBoundingClientRect().top + window.scrollY - m.stickyTop,
      );
      sheet.textContent = `@keyframes sparc-hero-travel{
0%{transform:${transformAt(m, 0)}}
${(LEAD * 100).toFixed(2)}%{transform:${transformAt(m, 0)}}
100%{transform:${transformAt(m, 1)}}
}
.sparc-hero-mark{
animation-name:sparc-hero-travel;
animation-duration:auto;
animation-timing-function:linear;
animation-fill-mode:both;
animation-timeline:scroll(root block);
animation-range:${startsAt.toFixed(2)}px ${(startsAt + m.travel).toFixed(2)}px;
}`;
      cssDriven = true;
      verifiedFar = false;
      mark.style.transform = "";
      scheduleVerify();
    };

    let m = measure();
    let queued = false;
    let frame = 0;
    let verifyFrame = 0;
    let verifiedFar = false;

    const progress = (at: Measurement) => {
      const raw = clamp01(
        (at.stickyTop - track.getBoundingClientRect().top) / at.travel,
      );
      return { raw, p: clamp01((raw - LEAD) / (1 - LEAD)) };
    };

    /* Belt and braces. `animation-duration: auto` is what makes a
       scroll-timeline animation span its range; an engine that parses the
       timeline but not the duration would snap the mark straight to its
       landed transform. So once the browser has had two frames to sample
       the timeline, the real computed matrix is compared against what the
       rAF path would have written, and the rAF takes the property back if
       they disagree. Cheap, and it runs once per measurement. */
    const scheduleVerify = () => {
      cancelAnimationFrame(verifyFrame);
      verifyFrame = requestAnimationFrame(() => {
        verifyFrame = requestAnimationFrame(() => {
          if (!cssDriven || !m) return;
          const expected = 1 + (m.scale - 1) * progress(m).p;
          const value = getComputedStyle(mark).transform;
          let actual = Number.NaN;
          if (value !== "none") {
            try {
              actual = new DOMMatrixReadOnly(value).a;
            } catch {
              /* leaves actual NaN, which fails the comparison below */
            }
          }
          if (!(Math.abs(actual - expected) < 0.02)) {
            clearCss();
            write();
          }
        });
      });
    };

    if (supportsScrollTimeline && m) installCss(m);

    const write = () => {
      queued = false;
      if (!m) return;

      const { raw, p } = progress(m);

      /* SPEC step 2: the copy goes on the first scroll, over 150ms, before
         anything moves. A data attribute rather than React state — this
         runs on every frame of a scroll. */
      copy.toggleAttribute("data-gone", raw > 0);

      if (!cssDriven) mark.style.transform = transformAt(m, p);
      /* Second check, once, somewhere in the middle of the travel: at the
         head of the track an engine that mis-read `animation-range` could
         still be sitting on an identity transform for the wrong reason. */
      else if (!verifiedFar && p > 0.3) {
        verifiedFar = true;
        scheduleVerify();
      }

      /* Landed. The traveller and the nav's own mark are the same artwork
         at the same place and size by now, so handing over is invisible —
         and it has to happen, because the sticky stage stops holding the
         traveller once the track scrolls past. Not a cross-fade: a swap
         between two identical, stationary states, and it reverses. */
      const landed = p >= 1;
      mark.style.opacity = landed ? "0" : "";
      if (navMark) navMark.style.opacity = landed ? "" : "0";
      if (navWordmark) {
        navWordmark.style.opacity = landed
          ? ""
          : `${clamp01((p - WORDMARK_IN) / (1 - WORDMARK_IN))}`;
      }
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      frame = requestAnimationFrame(write);
    };

    const onResize = () => {
      m = measure();
      if (supportsScrollTimeline && m) installCss(m);
      else clearCss();
      /* write(), not onScroll(): a resize has to land this frame, and it
         also clears a queued flag left over from a frame that never ran
         because the tab was hidden. */
      cancelAnimationFrame(frame);
      write();
    };

    write();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      live = false;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(verifyFrame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      for (const a of anims) a.cancel();
      clearCss();
      mark.style.transform = "";
      mark.style.opacity = "";
      copy.removeAttribute("data-gone");
      /* Restore the nav, whatever path we left by. */
      if (navMark) {
        navMark.style.opacity = "";
        navMark.style.transform = "";
      }
      if (navWordmark) {
        navWordmark.style.opacity = "";
        navWordmark.style.transform = "";
      }
      setSettled(true);
    };
  }, [motionEpoch]);

  return (
    <section ref={trackRef} className="sparc-hero" aria-label="SPARC">
      <style>{HERO_CSS}</style>
      {/* Filled in by the effect on the scroll-timeline path; empty on the
          rAF path and after unmount. */}
      <style ref={travelCssRef} />

      <div ref={stageRef} className="sparc-hero-stage">
        {/* justify-center centres the stack in the first screen; on lg the
            axis flips, so it is reset — the mark has to keep the container's
            left edge, which is the nav lockup's left edge. */}
        <div className="mx-auto flex h-full max-w-page flex-col items-start justify-center gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-start lg:gap-14 lg:px-8">
          {/* The slot never moves and never scales — it is the untransformed
              twin the measurement reads. The traveller is its only child. */}
          <div
            ref={slotRef}
            className="relative inline-flex h-[120px] shrink-0 sm:h-[152px] xl:h-[184px]"
          >
            <div
              ref={markRef}
              data-hero-mark
              className="sparc-hero-mark relative text-accent"
            >
              <SparcMark className="h-full w-auto" />
              {/* Ring layer: two ripples fired at the nodes. Coordinates and
                  viewBox are copied off the mark at mount, so there is no
                  second definition of the artwork's geometry here. */}
              <svg
                ref={ringLayerRef}
                aria-hidden="true"
                focusable="false"
                fill="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <circle stroke="currentColor" strokeWidth={13.6} opacity={0} />
                <circle stroke="currentColor" strokeWidth={13.6} opacity={0} />
              </svg>
            </div>
          </div>

          <div
            ref={copyRef}
            className="sparc-hero-copy max-w-text transition-opacity duration-150 ease-out data-[gone]:opacity-0"
          >
            <MicroLabel as="p" className="block">
              Suffolk University · Student Club
            </MicroLabel>
            {/* One of Ultra's three sanctioned appearances. */}
            <PosterText
              as="h1"
              size="sm"
              className="mt-3 text-accent sm:text-poster-md xl:text-poster-lg"
            >
              SPARC
            </PosterText>
            <p className="prose-block mt-5 text-sm sm:text-base">
              SPARC is a student club at Suffolk University where we build and
              ship real software, explore AI agentic coding, discuss the latest
              in tech, and connect members with real-world internships. All
              majors welcome.
            </p>
            <Link
              href="/join"
              className="mt-6 inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 text-sm text-on-accent transition-colors hover:bg-accent-hover"
            >
              Join Us
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
