/* Workday candidate-experience API (undocumented, unauthenticated):
 *   POST https://<tenant>.<host>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs
 *        {"appliedFacets":{},"limit":20,"offset":n,"searchText":"intern"}   (20 per page, paged to `total`)
 *   GET  https://<tenant>.<host>.myworkdayjobs.com/wday/cxs/<tenant>/<site><externalPath>
 *        → jobPostingInfo.{title, jobDescription (HTML), location, additionalLocations, startDate, endDate, externalUrl}
 * The search is fuzzy, so titles are filtered here; only postings that pass the title rule and
 * look local (or say "N Locations") get a detail request. */

import { htmlToText, isMassachusetts, isStudentRole, isoOrNull, tidyLocation } from "../normalize";
import type { Adapter, Http } from "../types";
import { buildJob } from "./job";

type ListPosting = { title: string; externalPath: string; locationsText?: string; postedOn?: string };
type Detail = {
  jobPostingInfo?: {
    title?: string;
    jobDescription?: string;
    location?: string;
    additionalLocations?: string[];
    startDate?: string;
    endDate?: string;
    timeType?: string;
    externalUrl?: string;
  };
};

const PAGE = 20;
const MAX_RESULTS = 2000;
const DETAIL_CONCURRENCY = 4;

async function search(http: Http, base: string, text: string): Promise<{ total: number; postings: ListPosting[] }> {
  const postings: ListPosting[] = [];
  let total = 0;
  for (let offset = 0; offset < MAX_RESULTS; offset += PAGE) {
    const page = await http.json<{ total?: number; jobPostings?: ListPosting[] }>(`${base}/jobs`, {
      method: "POST",
      body: { appliedFacets: {}, limit: PAGE, offset, searchText: text },
    });
    // Workday reports `total` on the first page only.
    if (offset === 0) total = page.total ?? 0;
    const rows = page.jobPostings ?? [];
    postings.push(...rows);
    if (rows.length < PAGE || offset + PAGE >= total) break;
  }
  return { total, postings };
}

async function mapLimit<T, R>(xs: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(xs.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, xs.length) }, async () => {
      while (i < xs.length) {
        const k = i++;
        out[k] = await fn(xs[k]);
      }
    }),
  );
  return out;
}

export const workday: Adapter<"workday"> = {
  kind: "internship",
  sourceName: () => "Workday",
  prefix: (s) => `workday:${s.tenant}:`,
  async fetch(s, { http, log, now }) {
    const officeCity = s.office?.split(/[,/(]/)[0].trim().toLowerCase();
    const candidates = new Map<string, { site: string; base: string; p: ListPosting }>();
    let fetched = 0;
    for (const site of s.sites) {
      const base = `https://${s.tenant}.${s.host}.myworkdayjobs.com/wday/cxs/${s.tenant}/${site}`;
      const seenHere = new Set<string>();
      for (const text of s.searches) {
        const { postings } = await search(http, base, text);
        for (const p of postings) {
          if (seenHere.has(p.externalPath)) continue;
          seenHere.add(p.externalPath);
          fetched++;
          if (candidates.has(p.externalPath) || !isStudentRole(p.title)) continue;
          const loc = p.locationsText ?? "";
          const maybeLocal =
            /\d+\s+locations/i.test(loc) || /remote/i.test(loc) || isMassachusetts(loc) || (officeCity ? loc.toLowerCase().includes(officeCity) : false);
          if (maybeLocal) candidates.set(p.externalPath, { site, base, p });
        }
      }
    }

    const details = await mapLimit([...candidates.values()], DETAIL_CONCURRENCY, async ({ base, p }) => {
      try {
        return { p, base, d: (await http.json<Detail>(`${base}${p.externalPath}`)).jobPostingInfo ?? null };
      } catch (e) {
        log(`detail ${p.externalPath}: ${(e as Error).message}`);
        return { p, base, d: null };
      }
    });

    const items = details.flatMap(({ p, base, d }) => {
      const locations = (d ? [d.location ?? "", ...(d.additionalLocations ?? [])] : [p.locationsText ?? ""]).map(tidyLocation);
      const item = buildJob({
        external_id: `workday:${s.tenant}:${p.externalPath}`,
        source_name: "Workday",
        source_url: `${base}/jobs`,
        title: d?.title ?? p.title,
        organizer: s.company,
        organizer_url: s.careers_url ?? null,
        url: d?.externalUrl ?? `https://${s.tenant}.${s.host}.myworkdayjobs.com/${base.split("/").pop()}${p.externalPath}`,
        posting_site: "Workday",
        locations,
        office: s.office,
        text: d?.jobDescription ? htmlToText(d.jobDescription) : null,
        termHints: d?.timeType === "Part time" ? "part-time" : "",
        tags: s.tags,
        posted_at: isoOrNull(d?.startDate ? `${d.startDate}T12:00:00Z` : null),
        deadline_on: d?.endDate && /^\d{4}-\d{2}-\d{2}$/.test(d.endDate) ? d.endDate : null,
      }, now);
      return item ? [item] : [];
    });
    return { fetched, items };
  },
};
