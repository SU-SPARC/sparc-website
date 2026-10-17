/* MLH season events. No JSON endpoint; https://www.mlh.com/seasons/<season>/events is an
 * Inertia app that embeds its props in <script data-page="app" type="application/json">.
 * props.upcomingEvents[] has name, slug, startsAt, endsAt, location, formatType
 * ("physical" | "hybrid_physical" | "digital"…), websiteUrl, region, venueAddress. Kept: North
 * America (region AMER, US or Canada) and digital events that have not ended. */

import { absoluteUrl, clean, dateOf, decodeEntities, isMassachusetts } from "../normalize";
import type { Adapter, SyncItem } from "../types";

type Event = {
  slug: string;
  name: string;
  status?: string;
  startsAt: string;
  endsAt: string;
  dateRange?: string;
  url?: string;
  location?: string;
  formatType?: string;
  websiteUrl?: string | null;
  region?: string;
  venueAddress?: { city?: string; state?: string; country?: string } | null;
};

export function extractInertia(html: string): unknown {
  const m = html.match(/<script[^>]*data-page="app"[^>]*>([\s\S]*?)<\/script>/i);
  if (m) return JSON.parse(m[1]);
  const attr = html.match(/data-page="([^"]+)"/); // older Inertia: JSON in the attribute
  if (attr && attr[1].startsWith("{")) return JSON.parse(decodeEntities(attr[1]));
  throw new Error("no Inertia page data found");
}

export const mlh: Adapter<"mlh"> = {
  kind: "hackathon",
  sourceName: () => "MLH",
  prefix: () => "mlh:",
  async fetch(s, { http, now }) {
    const source_url = `https://www.mlh.com/seasons/${s.season}/events`;
    const page = extractInertia(await http.text(source_url)) as { props?: { upcomingEvents?: Event[] } };
    const events = page.props?.upcomingEvents;
    if (!Array.isArray(events)) throw new Error("unexpected page data: no props.upcomingEvents");
    const items: SyncItem[] = [];
    for (const e of events) {
      if (new Date(e.endsAt) < now) continue;
      const digital = /digital|online|virtual/i.test(e.formatType ?? "");
      const hybrid = /hybrid/i.test(e.formatType ?? "");
      const country = e.venueAddress?.country ?? "";
      const location = clean(e.location ?? "");
      if (!digital && !(e.region === "AMER" && (country === "US" || country === "CA"))) continue;
      const area = digital ? "online" : country === "US" && isMassachusetts(`${location} ${e.venueAddress?.state ?? ""}`) ? "boston" : "outside_boston";
      const format = digital ? "online" : hybrid ? "hybrid" : "in_person";
      const eventPage = absoluteUrl(`/events/${e.slug}`, "https://www.mlh.com");
      items.push({
        external_id: `mlh:${e.slug}`,
        source_name: "MLH",
        source_url,
        kind: "hackathon",
        title: clean(e.name),
        organizer: "Major League Hacking",
        organizer_url: "https://mlh.io",
        url: e.websiteUrl || eventPage,
        posting_site: "MLH",
        summary: `MLH ${s.season} season ${digital ? "digital" : hybrid ? "hybrid" : "in-person"} hackathon${location && !digital ? ` in ${location}` : ""}.`,
        description: null,
        area,
        format,
        location: digital ? "Online" : location || null,
        starts_on: dateOf(e.startsAt),
        ends_on: dateOf(e.endsAt),
        deadline_on: null,
        dates_note: e.dateRange ? clean(e.dateRange) : null,
        internship_terms: [],
        pay: null,
        eligibility: null,
        tags: [...s.tags],
        posted_at: null,
      });
    }
    return { fetched: events.length, items };
  },
};
