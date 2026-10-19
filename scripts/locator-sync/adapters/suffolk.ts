/* Suffolk University events, area "suffolk", with a keyword filter so only
 * tech / startup / career / networking events land in the Locator.
 *   feed "localist": https://events.suffolk.edu/api/2/events?days=<n>&pp=100&page=<p>   (Localist API 2)
 *   feed "engage":   https://suffolk.campuslabs.com/engage/api/discovery/event/search?endsAfter=…&status=Approved&take=50&skip=<n>
 * Both are public JSON with no login. */

import { clean, cutDescription, dateOf, htmlToText, summarize, timeNote } from "../normalize";
import type { Adapter, AdapterContext, AdapterResult, SourceOf, SyncItem } from "../types";

type LocalistEvent = {
  id: number;
  title: string;
  localist_url: string;
  location_name?: string | null;
  room_number?: string | null;
  experience?: string | null;
  description_text?: string | null;
  ticket_url?: string | null;
  filters?: { event_types?: { name: string }[] };
  departments?: { name: string }[];
  event_instances?: { event_instance: { id: number; start: string; end: string | null; all_day?: boolean } }[];
};

type EngageEvent = {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  startsOn: string;
  endsOn?: string | null;
  organizationName?: string | null;
  categoryNames?: string[];
  theme?: string | null;
  visibility?: string;
};

const ONLINE = /\b(zoom|online|virtual|teams|webinar)\b/i;

function base(s: SourceOf<"suffolk">): Pick<SyncItem, "source_name" | "kind" | "area" | "internship_terms" | "pay" | "eligibility" | "deadline_on" | "posted_at"> {
  return {
    source_name: s.feed === "localist" ? "Suffolk events" : "Suffolk Engage",
    kind: "networking",
    area: "suffolk",
    internship_terms: [],
    pay: null,
    eligibility: "Suffolk University community.",
    deadline_on: null,
    posted_at: null,
  };
}

async function localist(s: SourceOf<"suffolk">, { http, now }: AdapterContext): Promise<AdapterResult> {
  const kw = new RegExp(`\\b(${s.keywords})\\b`, "i");
  const events: LocalistEvent[] = [];
  let source_url = "";
  for (let page = 1; page <= 10; page++) {
    const u = `https://events.suffolk.edu/api/2/events?days=${s.days}&pp=100&page=${page}`;
    if (page === 1) source_url = u;
    const data = await http.json<{ events?: { event: LocalistEvent }[]; page?: { current: number; total: number } }>(u);
    if (!Array.isArray(data.events)) throw new Error("unexpected response: no events[]");
    events.push(...data.events.map((e) => e.event));
    if (!data.page || data.page.current >= data.page.total) break;
  }
  const items: SyncItem[] = [];
  for (const e of events) {
    const types = (e.filters?.event_types ?? []).map((t) => t.name);
    const text = clean(e.description_text ?? "");
    if (!kw.test(`${e.title} ${types.join(" ")} ${text.slice(0, 600)}`)) continue;
    const online = /virtual/i.test(e.experience ?? "");
    const hybrid = /hybrid/i.test(e.experience ?? "");
    for (const { event_instance: inst } of e.event_instances ?? []) {
      const start = new Date(inst.start);
      const end = inst.end ? new Date(inst.end) : null;
      if ((end ?? start) < now) continue;
      const desc = cutDescription(text);
      items.push({
        ...base(s),
        external_id: `suffolk:localist:${inst.id}`,
        source_url,
        title: clean(e.title),
        organizer: clean(e.departments?.[0]?.name ?? "") || "Suffolk University",
        organizer_url: "https://events.suffolk.edu",
        url: e.localist_url,
        posting_site: "Suffolk events",
        summary: summarize(desc),
        description: desc,
        format: online ? "online" : hybrid ? "hybrid" : "in_person",
        location: online ? "Online" : clean([e.location_name, e.room_number].filter(Boolean).join(", ")) || "Suffolk University",
        starts_on: dateOf(start),
        ends_on: dateOf(end && end >= start ? end : start),
        dates_note: inst.all_day ? null : timeNote(start, end),
        tags: [...s.tags],
      });
    }
  }
  return { fetched: events.length, items };
}

async function engage(s: SourceOf<"suffolk">, { http, now }: AdapterContext): Promise<AdapterResult> {
  const kw = new RegExp(`\\b(${s.keywords})\\b`, "i");
  const horizon = new Date(now.getTime() + s.days * 86_400_000);
  const after = encodeURIComponent(now.toISOString());
  const events: EngageEvent[] = [];
  let source_url = "";
  for (let skip = 0; skip < 500; skip += 50) {
    const u = `https://suffolk.campuslabs.com/engage/api/discovery/event/search?endsAfter=${after}&orderByField=endsOn&orderByDirection=ascending&status=Approved&take=50&skip=${skip}`;
    if (skip === 0) source_url = u.replace(/endsAfter=[^&]+&/, "");
    const data = await http.json<{ "@odata.count"?: number; value?: EngageEvent[] }>(u);
    if (!Array.isArray(data.value)) throw new Error("unexpected response: no value[]");
    events.push(...data.value);
    if (data.value.length < 50 || events.length >= (data["@odata.count"] ?? 0)) break;
  }
  const items: SyncItem[] = [];
  for (const e of events) {
    if (e.visibility && e.visibility !== "Public") continue;
    const start = new Date(e.startsOn);
    const end = e.endsOn ? new Date(e.endsOn) : null;
    if (start > horizon || (end ?? start) < now) continue;
    const text = e.description ? htmlToText(e.description) : "";
    const hay = `${e.name} ${e.organizationName ?? ""} ${(e.categoryNames ?? []).join(" ")} ${e.theme ?? ""} ${text.slice(0, 600)}`;
    if (!kw.test(hay)) continue;
    const online = ONLINE.test(e.location ?? "");
    const desc = cutDescription(text);
    items.push({
      ...base(s),
      external_id: `suffolk:engage:${e.id}`,
      source_url,
      title: clean(e.name),
      organizer: clean(e.organizationName ?? "") || "Suffolk University",
      organizer_url: null,
      url: `https://suffolk.campuslabs.com/engage/event/${e.id}`,
      posting_site: "Suffolk Engage",
      summary: summarize(desc),
      description: desc,
      format: online ? "online" : "in_person",
      location: online ? "Online" : clean(e.location ?? "") || "Suffolk University",
      starts_on: dateOf(start),
      ends_on: dateOf(end && end >= start ? end : start),
      dates_note: timeNote(start, end),
      tags: [...s.tags],
    });
  }
  return { fetched: events.length, items };
}

export const suffolk: Adapter<"suffolk"> = {
  kind: "networking",
  sourceName: (s) => (s.feed === "localist" ? "Suffolk events" : "Suffolk Engage"),
  prefix: (s) => `suffolk:${s.feed}:`,
  fetch: (s, ctx) => (s.feed === "localist" ? localist(s, ctx) : engage(s, ctx)),
};
