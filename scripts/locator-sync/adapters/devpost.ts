/* Devpost hackathon listing (undocumented JSON behind devpost.com/hackathons):
 *   GET https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&page=n   (9 per page)
 * plus one `search=boston` page so local in-person events are never paged out.
 * Dates are the submission period as text ("Oct 05 - 27, 2026"). */

import { clean, htmlToText, normalizeTags, placeEvent, today } from "../normalize";
import type { Adapter, SyncItem } from "../types";

type Hackathon = {
  id: number;
  title: string;
  url: string;
  submission_period_dates?: string;
  open_state?: string;
  prize_amount?: string;
  registrations_count?: number;
  displayed_location?: { icon?: string; location?: string };
  themes?: { name: string }[];
  organization_name?: string | null;
  invite_only?: boolean;
};

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");

/** "Aug 31 - Oct 23, 2026" | "Oct 05 - 27, 2026" | "Dec 28, 2026 - Jan 05, 2027" | "Nov 07, 2026" */
export function parseDevpostDates(text: string): { starts_on: string; ends_on: string } | null {
  const t = clean(text);
  const range = t.match(/^([A-Za-z]{3})\w*\s+(\d{1,2})(?:,\s*(\d{4}))?\s*[-–]\s*(?:([A-Za-z]{3})\w*\s+)?(\d{1,2}),\s*(\d{4})$/);
  if (range) {
    const [, m1, d1, y1, m2, d2, y2] = range;
    const sm = MONTHS[m1.toLowerCase()];
    const em = m2 ? MONTHS[m2.toLowerCase()] : sm;
    if (!sm || !em) return null;
    const ey = Number(y2);
    const sy = y1 ? Number(y1) : em < sm ? ey - 1 : ey;
    return { starts_on: `${sy}-${pad(sm)}-${pad(Number(d1))}`, ends_on: `${ey}-${pad(em)}-${pad(Number(d2))}` };
  }
  const single = t.match(/^([A-Za-z]{3})\w*\s+(\d{1,2}),\s*(\d{4})$/);
  if (single) {
    const m = MONTHS[single[1].toLowerCase()];
    if (!m) return null;
    const d = `${single[3]}-${pad(m)}-${pad(Number(single[2]))}`;
    return { starts_on: d, ends_on: d };
  }
  return null;
}

export const devpost: Adapter<"devpost"> = {
  kind: "hackathon",
  sourceName: () => "Devpost",
  prefix: () => "devpost:",
  async fetch(s, { http, now }) {
    const base = "https://devpost.com/api/hackathons?status[]=upcoming&status[]=open";
    const urls = Array.from({ length: s.pages }, (_, i) => `${base}&page=${i + 1}`);
    urls.push(`${base}&search=boston&page=1`);
    const byId = new Map<number, { h: Hackathon; source_url: string }>();
    for (const u of urls) {
      const data = await http.json<{ hackathons?: Hackathon[] }>(u);
      if (!Array.isArray(data.hackathons)) throw new Error("unexpected response: no hackathons[]");
      for (const h of data.hackathons) if (!byId.has(h.id)) byId.set(h.id, { h, source_url: u });
    }
    const todayIso = today(now);
    const items: SyncItem[] = [];
    for (const { h, source_url } of byId.values()) {
      if (h.invite_only) continue;
      const dates = h.submission_period_dates ? parseDevpostDates(h.submission_period_dates) : null;
      if (!dates || dates.ends_on < todayIso) continue;
      const locText = h.displayed_location?.location ?? "";
      const online = h.displayed_location?.icon === "globe" || /^online$/i.test(locText);
      const place = placeEvent(locText, online);
      if (!place) continue;
      const prize = h.prize_amount ? clean(htmlToText(h.prize_amount)) : "";
      const pay = prize && prize !== "$0" ? `${prize} in prizes` : null;
      const organizer = clean(h.organization_name ?? "") || "Devpost";
      const bits = [
        `${place.area === "online" ? "Online" : "In-person"} hackathon hosted by ${organizer}`,
        pay ? `${pay}` : null,
        h.registrations_count ? `${h.registrations_count.toLocaleString("en-US")} registered` : null,
      ].filter(Boolean);
      items.push({
        external_id: `devpost:${h.id}`,
        source_name: "Devpost",
        source_url,
        kind: "hackathon",
        title: clean(h.title),
        organizer,
        organizer_url: null,
        url: h.url,
        posting_site: "Devpost",
        summary: `${bits.join(" · ")}.`,
        description: null,
        area: place.area,
        format: place.format,
        location: place.location,
        starts_on: dates.starts_on,
        ends_on: dates.ends_on,
        deadline_on: dates.ends_on,
        dates_note: `Submission period ${clean(h.submission_period_dates ?? "")}.`,
        internship_terms: [],
        pay,
        eligibility: null,
        tags: normalizeTags([...s.tags, ...(h.themes ?? []).map((t) => t.name)], 5),
        posted_at: null,
      });
    }
    return { fetched: byId.size, items };
  },
};
