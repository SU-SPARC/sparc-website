/* Luma calendar / "discover" place feed: GET https://api.lu.ma/ics/get?entity=<entity>&id=<id>.
 * Undocumented but public. LOCATION is the Luma event link and GEO the venue; a keyword filter
 * keeps the tech / startup / career events out of a city-wide feed. */

import type { Adapter } from "../types";
import { ical } from "./shared-events";

export const lumaIcal: Adapter<"luma_ical"> = {
  kind: "networking",
  sourceName: () => "Luma",
  prefix: (s) => `luma:${s.feed_id}:`,
  async fetch(s, ctx) {
    const source_url = `https://api.lu.ma/ics/get?entity=${s.entity}&id=${encodeURIComponent(s.feed_id)}`;
    const text = await ctx.http.text(source_url);
    if (!/BEGIN:VCALENDAR/.test(text)) throw new Error("not an iCalendar feed");
    return ical(text, {
      ctx,
      days: s.days,
      idPrefix: `luma:${s.feed_id}:`,
      source_name: "Luma",
      source_url,
      organizer: s.name,
      organizer_url: null,
      posting_site: "Luma",
      area: "boston",
      tags: s.tags,
      keywords: new RegExp(`\\b(${s.keywords})\\b`, "i"),
      luma: true,
    });
  },
};
