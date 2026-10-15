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
 * The photo set is the published gallery (photos table, by sort_order),
 * fetched here and handed to the client PhotoDrift as plain props.
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

import { NewsPreview, StatsBand } from "./home-sections";
import { Hero } from "@/components/ui/hero";
import { PhotoDrift } from "@/components/ui/photo-drift";
import { getMembers, getNews, getPhotos, getProjects } from "@/lib/data";

/* No title: the root layout's template default already reads
   "SPARC — Suffolk Programming, AI & Research Club". */
export const metadata: Metadata = {
  description:
    "SPARC is a student club at Suffolk University where we build and ship real software, explore AI agentic coding, discuss the latest in tech, and connect members with real-world internships. All majors welcome.",
};

/* ISR: a safety net; admin saves revalidate on demand. */
export const revalidate = 300;

export default async function Home() {
  const [photos, members, projects, news] = await Promise.all([
    getPhotos(),
    getMembers(),
    getProjects(),
    getNews(),
  ]);

  /* The drift cards are 140–180px wide, so the 640px thumb is the source;
     the optimizer still sizes it down. When a photo has no alt the old
     positional alt is used: these are mostly undescribed club photos, and
     numbering them is honest where inventing captions is not. */
  const gallery = photos.map((photo, i) => ({
    src: photo.image.thumb,
    alt: photo.image.alt || photo.caption || `SPARC gallery image ${i + 1}`,
    blur: photo.image.blur,
  }));

  return (
    /* No top padding: the hero's sticky stage has to start flush under the
       nav row for the bolt's landing maths and for the first screen to fill
       the viewport. */
    <main>
      <Hero />
      {gallery.length > 0 ? <PhotoDrift photos={gallery} /> : null}
      <StatsBand members={members} projects={projects} />
      {news.length > 0 ? <NewsPreview news={news} /> : null}
    </main>
  );
}
