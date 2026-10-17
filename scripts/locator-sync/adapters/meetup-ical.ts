/* Meetup group calendar: GET https://www.meetup.com/<group>/events/ical/ (public groups, no login).
 * The feed has no LOCATION; an event counts as online when its description says Zoom /
 * online / virtual / livestream, otherwise it takes the source's area (boston by default). */

import type { Adapter } from "../types";
import { ical } from "./shared-events";

export const meetupIcal: Adapter<"meetup_ical"> = {
  kind: "networking",
  sourceName: () => "Meetup",
  prefix: (s) => `meetup:${s.group.toLowerCase()}:`,
  async fetch(s, ctx) {
    const source_url = `https://www.meetup.com/${encodeURIComponent(s.group)}/events/ical/`;
    const text = await ctx.http.text(source_url);
    if (!/BEGIN:VCALENDAR/.test(text)) throw new Error("not an iCalendar feed");
    return ical(text, {
      ctx,
      days: s.days,
      idPrefix: `meetup:${s.group.toLowerCase()}:`,
      source_name: "Meetup",
      source_url,
      organizer: s.name,
      organizer_url: `https://www.meetup.com/${s.group}/`,
      posting_site: "Meetup",
      area: s.area,
      tags: s.tags,
      keywords: null,
    });
  },
};
