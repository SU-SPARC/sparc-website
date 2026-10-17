/* SimplifyJobs internship list: the raw listings.json behind the GitHub README
 * (https://raw.githubusercontent.com/<repo>/<branch>/.github/scripts/listings.json, ~13 MB).
 * The repo has no licence file, so rows only link out to the employer's posting.
 * Kept: active && is_visible, a Massachusetts or US-remote location, and at least one
 * term that has not already ended. */

import type { InternshipTerm } from "../../../lib/data/types";
import { inferTerms, isoOrNull, placeJob, postingSiteOf, seasonEnd, titleTermsAllPast } from "../normalize";
import type { Adapter } from "../types";

type Listing = {
  id: string;
  company_name: string;
  title: string;
  locations?: string[];
  url: string;
  date_posted?: number;
  date_updated?: number;
  terms?: string[];
  active?: boolean;
  is_visible?: boolean;
  sponsorship?: string;
  category?: string;
  degrees?: string[];
};

function parseTerm(t: string): { term: InternshipTerm; endsBy: Date } | null {
  const m = t.match(/^(spring|summer|fall|winter)\s+(\d{4})$/i);
  if (!m) return null;
  const season = m[1].toLowerCase();
  const year = Number(m[2]);
  const term: InternshipTerm = season === "summer" ? "summer" : season === "winter" ? "winter" : "semester_part_time";
  // first day of the month after the season ends
  return { term, endsBy: seasonEnd(season, year) };
}

const repoKey = (repo: string) => repo.split("/")[1].toLowerCase();

function eligibility(l: Listing): string | null {
  const parts: string[] = [];
  if (l.sponsorship && l.sponsorship !== "Other") parts.push(`Sponsorship: ${l.sponsorship}.`);
  if (l.degrees?.length) parts.push(`Degree: ${l.degrees.join(", ")}.`);
  return parts.length ? parts.join(" ") : null;
}

export const simplify: Adapter<"simplify"> = {
  kind: "internship",
  sourceName: () => "SimplifyJobs",
  // The repo is part of the id so two Simplify lists (internships, new grad) close independently.
  prefix: (s) => `simplify:${repoKey(s.repo)}:`,
  async fetch(s, { http, now }) {
    const source_url = `https://raw.githubusercontent.com/${s.repo}/${s.branch}/${s.path}`;
    const data = await http.json<Listing[]>(source_url);
    if (!Array.isArray(data)) throw new Error("unexpected response: not a list");
    const items = data.flatMap((l) => {
      if (!l.active || !l.is_visible || !l.url || !l.title || titleTermsAllPast(l.title, now)) return [];
      const place = placeJob(l.locations ?? []);
      if (!place) return [];
      const parsed = (l.terms ?? []).map(parseTerm);
      const known = parsed.filter((p): p is NonNullable<typeof p> => p !== null);
      const current = known.filter((p) => p.endsBy > now);
      if (known.length && !current.length) return []; // every stated term is over
      // the title can add what the term list leaves out ("Intern/Co-op")
      const fromTitle = inferTerms(l.title).filter((t) => t === "coop" || !known.length);
      const terms = [...new Set([...current.map((p) => p.term), ...fromTitle])].sort();
      const stated = (l.terms ?? []).filter((t) => t !== "N/A");
      const category = l.category ? [l.category] : [];
      return [
        {
          external_id: `simplify:${repoKey(s.repo)}:${l.id}`,
          source_name: "SimplifyJobs",
          source_url,
          kind: "internship" as const,
          title: l.title.replace(/\s+/g, " ").trim(),
          organizer: l.company_name.trim(),
          organizer_url: null,
          url: l.url,
          posting_site: postingSiteOf(l.url),
          summary: null,
          description: null,
          area: place.area,
          format: place.format,
          location: place.location,
          starts_on: null,
          ends_on: null,
          deadline_on: null,
          dates_note: stated.length ? stated.join(", ") : "Term not stated in the posting.",
          internship_terms: terms,
          pay: null,
          eligibility: eligibility(l),
          tags: [...new Set([...s.tags, ...category.map((c) => c.toLowerCase().replace(/[^a-z0-9 .+#-]/g, " ").replace(/\s+/g, " ").trim())])].filter(Boolean).slice(0, 6),
          posted_at: isoOrNull(l.date_posted ? l.date_posted * 1000 : null),
        },
      ];
    });
    return { fetched: data.length, items };
  },
};
