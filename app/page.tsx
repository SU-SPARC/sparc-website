/* Home. Server component — the two moving parts are client components it
 * renders, and nothing else on this page needs the client.
 *
 * What used to be here and is not any more:
 *   - hero-slideshow: replaced by the hero itself (SPEC "Home / Hero").
 *   - news-carousel + the news-article cards: SPEC kills the carousel, and
 *     the reason it kills it — dated items whose value is that they
 *     accumulate should not hide behind interaction — rules out rebuilding
 *     the same three items as static cards. /events owns dated content.
 *   - writing-text: it existed only for the old hero's headline.
 *   - the two-column grid whose arbitrary track list was comma-separated:
 *     commas are invalid in Tailwind v4 arbitrary values, so that layout was
 *     silently collapsing. The rewrite is flex and has no grid to fix.
 *
 * The photo set is the gallery array from the page this replaces, mapped
 * from the old public/*.jpeg to the migrated public/images/*.webp.
 *
 * WHAT CAME BACK, AND WHY IT IS NOT THE CAROUSEL. The client reviewed this
 * page as empty and supplied two mockups (Aug 2026): a stats band and a news
 * preview. Both live in ./home-sections.tsx and both are static server
 * markup — see that file's header for the provenance of every string and for
 * why three visible cards do not re-open SPEC's objection to the carousel.
 *
 * ORDER. Hero → PhotoDrift → StatsBand → NewsPreview. Client request
 * (Aug 2026): the photos sit directly under the hero, and the stats band —
 * a short, still, hairlined row — becomes the divider between the photo row
 * and the news. The drift is therefore one section closer to the fold than
 * it was, but that does not weaken the "hero and drift never move at once"
 * guarantee: its start is still gated on its own IntersectionObserver AND
 * on onHeroSettled(), so it cannot begin while the hero is still settling
 * no matter how early it enters the viewport.
 */

import type { Metadata } from "next";

import { NewsPreview, StatsBand } from "@/app/home-sections";
import { Hero } from "@/components/ui/hero";
import { PhotoDrift } from "@/components/ui/photo-drift";

/* No title: the root layout's template default already reads
   "SPARC — Suffolk Programming, AI & Research Club". */
export const metadata: Metadata = {
  description:
    "SPARC is a student club at Suffolk University where we build and ship real software, explore AI agentic coding, discuss the latest in tech, and connect members with real-world internships. All majors welcome.",
};

const GALLERY = [
  "sparc-8",
  "sparc-3",
  "sparc-5",
  "sparc-4",
  "sparc-6",
  "sparc-7",
  "sparc-1",
  "sparc-2",
  "sparc-contact",
  "sparc-projects",
  "sparc-vc-1",
  "sparc-vc-2",
  "sparc-vc-3",
  "sparc-vc-4",
  "sparc-vc-5",
  "sparc-vc-6",
  "sparc-vc-7",
  "sparc-vc-8",
  "sparc-vc-9",
].map((name, i) => ({
  src: `/images/${name}.webp`,
  /* The alt the old slideshow used. These are undescribed club photos in
     the repo; numbering them is honest, inventing captions is not. */
  alt: `SPARC gallery image ${i + 1}`,
}));

export default function Home() {
  return (
    /* No top padding: the hero's sticky stage has to start flush under the
       nav row for the bolt's landing maths and for the first screen to fill
       the viewport. */
    <main>
      <Hero />
      <PhotoDrift photos={GALLERY} />
      <StatsBand />
      <NewsPreview />
    </main>
  );
}
