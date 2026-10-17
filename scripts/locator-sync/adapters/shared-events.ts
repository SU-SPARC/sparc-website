/* iCal VEVENTs → networking SyncItems, shared by the Meetup and Luma adapters. */

import type { OpportunityArea } from "../../../lib/data/types";
import { parseIcal } from "../ical";
import { clean, cutDescription, dateOf, summarize, timeNote } from "../normalize";
import type { AdapterContext, AdapterResult, SyncItem } from "../types";

const ONLINE_TEXT = /\b(zoom|online|virtual|livestream|live stream|webinar|google meet|teams meeting)\b/i;

export function ical(
  text: string,
  o: {
    ctx: AdapterContext;
    days: number;
    idPrefix: string;
    source_name: string;
    source_url: string;
    organizer: string;
    organizer_url: string | null;
    posting_site: string;
    area: OpportunityArea;
    tags: string[];
    keywords: RegExp | null;
    luma?: boolean;
  },
): AdapterResult {
  const events = parseIcal(text);
  const horizon = new Date(o.ctx.now.getTime() + o.days * 86_400_000);
  const items: SyncItem[] = [];
  for (const e of events) {
    if (e.status === "CANCELLED") continue;
    const ends = e.end ?? e.start;
    if (ends < o.ctx.now || e.start > horizon) continue;
    const title = clean(e.summary);
    if (!title) continue;
    let description = e.description;
    let url = /^https?:\/\//.test(e.url) ? e.url : "";
    let hostLine: string | null = null;
    if (o.luma) {
      // "Get up-to-date information at: <link>\n\nAddress:\n…\n\n<body>\n\nHosted by …"
      url = url || e.description.match(/https:\/\/(?:lu\.ma|luma\.com)\/[\w-]+/)?.[0] || e.location;
      description = description.replace(/^Get up-to-date information at:\s*\S+\s*/i, "");
      hostLine = description.match(/Hosted by ([^\n]+)\s*$/)?.[1] ?? null;
    } else {
      // Meetup prefixes the group name as the first line
      description = description.replace(new RegExp(`^${o.organizer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n`), "");
    }
    if (!url) continue;
    if (o.keywords && !o.keywords.test(`${title} ${description.slice(0, 1500)}`)) continue;
    const address = o.luma ? description.match(/^Address:\s*\n([^\n]+)/i)?.[1] : null;
    const online = ONLINE_TEXT.test(`${title} ${o.luma ? address ?? "" : description.slice(0, 600)}`) && !(o.luma && e.geo);
    const location = online ? "Online" : clean(address && !/check event page/i.test(address) ? address : e.location && !/^https?:/.test(e.location) ? e.location : "") || null;
    const desc = cutDescription(description);
    items.push({
      external_id: `${o.idPrefix}${e.uid}`,
      source_name: o.source_name,
      source_url: o.source_url,
      kind: "networking",
      title,
      organizer: hostLine ? clean(hostLine).slice(0, 120) : o.organizer,
      organizer_url: o.organizer_url,
      url,
      posting_site: o.posting_site,
      summary: summarize(desc),
      description: desc,
      area: online ? "online" : o.area,
      format: online ? "online" : "in_person",
      location,
      starts_on: dateOf(e.start),
      ends_on: dateOf(ends) && dateOf(ends)! >= dateOf(e.start)! ? dateOf(ends) : dateOf(e.start),
      deadline_on: null,
      dates_note: e.allDay ? null : timeNote(e.start, e.end),
      internship_terms: [],
      pay: null,
      eligibility: null,
      tags: [...o.tags],
      posted_at: null,
    });
  }
  return { fetched: events.length, items };
}
