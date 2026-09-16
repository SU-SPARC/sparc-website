"use client";

/* PhotoDrift — scatter-to-grid entrance that hands off into a slow drift.
 * Translated from design/photo-entrance-drift.html; that file's custom
 * property names drifted from the token layer and none of them exist here.
 *
 * THE HANDOFF IS THE POINT. The entrance transforms each CARD; the drift
 * transforms the TRACK. Two different elements, so the two transforms never
 * fight — the cards land on their real positions and the row starts moving
 * underneath them.
 *
 * The drift is WAAPI rather than a CSS keyframe for one reason: playbackRate.
 * A linear loop that starts the instant the last card lands reads as a jerk,
 * so the rate ramps 0 → 1 over 900ms and the row picks up speed. Hover
 * (capability-gated) ramps it back down to a stop instead of pausing
 * mid-stride.
 *
 * The entrance is WAAPI too, for a different reason: it is created paused at
 * time 0 with `fill: "backwards"` in a layout effect, so the scattered
 * from-state is on screen before the first paint and there is no flash of
 * settled cards while the section is still below the fold. Nothing is left
 * inline when it finishes.
 *
 * It starts on IntersectionObserver, never on load — SPEC: "the hero and the
 * drift must not both be moving at once". Below the fold is most of that
 * guarantee; onHeroSettled() is the rest, for a flick fast enough to reach
 * the band before the hero's entrance is done.
 *
 * Reduced motion: no entrance, no observer, no WAAPI, no rAF. The row is
 * static and the clipped overflow is opened up so it can still be reached.
 */

import Image from "next/image";
import * as React from "react";

import { onHeroSettled } from "@/components/ui/hero";

export interface PhotoDriftProps {
  photos: { src: string; alt: string }[];
}

/* px per second. The reference runs a ~3.7k row in 44s; this is the same
   pace expressed as a speed, so the loop keeps it at any card count. */
const SPEED = 80;
const STAGGER = 70; // SPEC's number
const SETTLE_MS = 850;
const RAMP_UP_MS = 900; // SPEC's number
const HOVER_DOWN_MS = 450;
const HOVER_UP_MS = 700;

/* Deterministic scatter. Random would do, but a fixed jitter means the
   entrance is the same every load and can actually be reviewed. */
function jitter(i: number, salt: number) {
  const n = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n); // 0..1
}

const DRIFT_CSS = `
.sparc-drift-stage{
  overflow:hidden;
  /* black/transparent here are alpha, not paint — a mask's luminance is its
     alpha channel, the same reason sparc-mark.tsx's mask is exempt from the
     no-raw-colour rule. Nothing about this tracks the theme. */
  -webkit-mask-image:linear-gradient(90deg,transparent,black 6%,black 94%,transparent);
  mask-image:linear-gradient(90deg,transparent,black 6%,black 94%,transparent);
}
.sparc-drift-track{
  display:flex;
  width:max-content;
  gap:var(--sparc-drift-gap);
  will-change:transform;
}
/* Hover only means anything once the row is moving, and only on a device
   that has a real pointer. The global reduced-motion block in globals.css
   flattens the transition; data-drifting is never set there anyway. */
@media (hover:hover) and (pointer:fine){
  .sparc-drift-stage[data-drifting] [data-card]{
    transition:transform 320ms var(--ease-out);
  }
  .sparc-drift-stage[data-drifting] [data-card]:hover{
    transform:scale(1.06);
  }
}
`;

const useIsoLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export function PhotoDrift({ photos }: PhotoDriftProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  const [motionEpoch, setMotionEpoch] = React.useState(0);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setMotionEpoch((n) => n + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useIsoLayoutEffect(() => {
    const stage = stageRef.current;
    const track = trackRef.current;
    if (!stage || !track) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      /* Static row. The clip is what makes a still row useless, so it opens
         into a scroll container the keyboard can reach; the duplicates go,
         since there is nothing left for them to seam. */
      stage.style.overflowX = "auto";
      stage.tabIndex = 0;
      const dupes = track.querySelectorAll<HTMLElement>("[data-dupe]");
      for (const dupe of dupes) dupe.style.display = "none";
      return () => {
        stage.style.overflowX = "";
        stage.removeAttribute("tabindex");
        for (const dupe of dupes) dupe.style.display = "";
      };
    }

    const ease =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--ease-out")
        .trim() || "ease-out";

    const cards = [...track.querySelectorAll<HTMLElement>("[data-card]")];
    const originals = cards.filter((c) => !c.hasAttribute("data-dupe"));

    /* Created paused so the scattered state is painted from the start; the
       observer only presses play. Duplicates never enter — they are off
       screen at rest and would only fight the seam. */
    const entrance = originals.map((card, i) => {
      const anim = card.animate(
        [
          {
            transform: `translate(${(jitter(i, 1) * 200 - 100).toFixed(1)}px, ${(
              jitter(i, 2) * 150 -
              40
            ).toFixed(1)}px) rotate(${(jitter(i, 3) * 20 - 10).toFixed(2)}deg) scale(0.86)`,
            opacity: 0,
          },
          { transform: "none", opacity: 1 },
        ],
        {
          duration: SETTLE_MS,
          delay: i * STAGGER,
          easing: ease,
          fill: "backwards",
        },
      );
      anim.pause();
      return anim;
    });

    let drift: Animation | null = null;
    let rampFrame = 0;
    let duration = 0;
    let alive = true;

    const setRate = (target: number, ms: number) => {
      if (!drift) return;
      cancelAnimationFrame(rampFrame);
      const from = drift.playbackRate;
      const t0 = performance.now();
      const step = (now: number) => {
        if (!drift) return;
        const k = Math.min(1, (now - t0) / ms);
        const eased = 1 - Math.pow(1 - k, 3);
        drift.playbackRate = from + (target - from) * eased;
        if (k < 1) rampFrame = requestAnimationFrame(step);
      };
      step(t0);
    };

    /* One set plus one gap. Measured off the live box rather than
       scrollWidth, which is rounded to whole pixels and would drop a
       visible step at the seam once a minute. */
    const loopDistance = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      const width = track.getBoundingClientRect().width;
      return (width - gap) / 2 + gap;
    };

    const buildDrift = (rate: number, progress: number) => {
      const distance = loopDistance();
      if (distance <= 0) return;
      duration = (distance / SPEED) * 1000;
      drift = track.animate(
        [
          { transform: "translate3d(0px, 0, 0)" },
          { transform: `translate3d(${-distance}px, 0, 0)` },
        ],
        { duration, iterations: Infinity, easing: "linear" },
      );
      drift.currentTime = progress * duration;
      drift.playbackRate = rate;
    };

    const startDrift = () => {
      if (!alive || drift) return;
      buildDrift(0, 0);
      if (!drift) return;
      stage.setAttribute("data-drifting", "");
      setRate(1, RAMP_UP_MS);
    };

    const runEntrance = () => {
      if (!alive) return;
      for (const anim of entrance) anim.play();
      const last = entrance[entrance.length - 1];
      if (!last) return startDrift();
      void last.finished.then(startDrift).catch(() => {});
    };

    let unsubscribe = () => {};
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          unsubscribe = onHeroSettled(runEntrance);
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(stage);

    /* Card widths change at the sm breakpoint, and a late image decode can
       nudge the box; either way the loop distance is wrong afterwards.
       Rebuild in place, keeping the phase and the current rate so nothing
       visibly restarts. */
    let lastWidth = track.getBoundingClientRect().width;
    const resize = new ResizeObserver(() => {
      const width = track.getBoundingClientRect().width;
      if (!drift || Math.abs(width - lastWidth) < 0.5) return;
      lastWidth = width;
      const progress = duration
        ? ((Number(drift.currentTime) || 0) % duration) / duration
        : 0;
      const rate = drift.playbackRate;
      drift.cancel();
      drift = null;
      buildDrift(rate, progress);
    });
    resize.observe(track);

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onEnter = () => setRate(0, HOVER_DOWN_MS);
    const onLeave = () => setRate(1, HOVER_UP_MS);
    if (fine) {
      stage.addEventListener("pointerenter", onEnter);
      stage.addEventListener("pointerleave", onLeave);
    }

    return () => {
      alive = false;
      observer.disconnect();
      resize.disconnect();
      unsubscribe();
      cancelAnimationFrame(rampFrame);
      if (fine) {
        stage.removeEventListener("pointerenter", onEnter);
        stage.removeEventListener("pointerleave", onLeave);
      }
      for (const anim of entrance) anim.cancel();
      drift?.cancel();
      drift = null;
      stage.removeAttribute("data-drifting");
    };
  }, [motionEpoch, photos]);

  const row = [...photos, ...photos];

  return (
    <section aria-label="SPARC gallery" className="py-section">
      <style>{DRIFT_CSS}</style>
      <div
        ref={stageRef}
        className="sparc-drift-stage [--sparc-drift-gap:0.75rem] sm:[--sparc-drift-gap:0.875rem]"
      >
        <div ref={trackRef} className="sparc-drift-track">
          {row.map((photo, i) => {
            const dupe = i >= photos.length;
            return (
              <div
                key={`${photo.src}-${i}`}
                data-card
                data-dupe={dupe ? "" : undefined}
                aria-hidden={dupe || undefined}
                className="relative aspect-[3/4] w-[140px] shrink-0 overflow-hidden rounded-card bg-surface-2 sm:w-[180px]"
              >
                <Image
                  src={photo.src}
                  alt={dupe ? "" : photo.alt}
                  fill
                  sizes="(max-width: 640px) 140px, 180px"
                  className="object-cover"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
