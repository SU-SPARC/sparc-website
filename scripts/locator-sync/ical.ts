/* Minimal iCalendar (RFC 5545) reader for the Meetup and Luma feeds: unfolds
 * continuation lines, reads VEVENT properties with their parameters, unescapes
 * TEXT values and turns DTSTART/DTEND (UTC, TZID-local or DATE) into instants. */

export type IcalEvent = {
  uid: string;
  summary: string;
  description: string;
  location: string;
  url: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  geo: string;
  status: string;
};

type Prop = { name: string; params: Record<string, string>; value: string };

function unfold(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function parseLine(line: string): Prop | null {
  // NAME;PARAM=a;PARAM="b:c":value — a colon inside a quoted parameter is not the separator.
  let i = 0;
  let inQuote = false;
  for (; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === ":" && !inQuote) break;
  }
  if (i >= line.length) return null;
  const [name, ...rawParams] = line.slice(0, i).split(";");
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: name.toUpperCase(), params, value: line.slice(i + 1) };
}

export function unescapeText(v: string): string {
  return v.replace(/\\([nN,;\\])/g, (_, c: string) => (c === "n" || c === "N" ? "\n" : c));
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - instant;
}

/** Wall-clock time in `timeZone` → instant (two passes settle DST edges). */
function zonedToInstant(y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string): Date {
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  let t = wall - zoneOffset(wall, timeZone);
  t = wall - zoneOffset(t, timeZone);
  return new Date(t);
}

export function parseIcalDate(prop: Prop, defaultZone: string): { date: Date; allDay: boolean } | null {
  const v = prop.value.trim();
  const dateOnly = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly.map(Number);
    return { date: zonedToInstant(y, m, d, 0, 0, 0, defaultZone), allDay: true };
  }
  const dt = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!dt) return null;
  const [y, m, d, h, mi, s] = dt.slice(1, 7).map(Number);
  if (dt[7] === "Z") return { date: new Date(Date.UTC(y, m - 1, d, h, mi, s)), allDay: false };
  let zone = prop.params.TZID ?? defaultZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = defaultZone;
  }
  return { date: zonedToInstant(y, m, d, h, mi, s, zone), allDay: false };
}

export function parseIcal(text: string, defaultZone = "America/New_York"): IcalEvent[] {
  const events: IcalEvent[] = [];
  let cur: Prop[] | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") {
      cur = [];
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        const get = (n: string) => cur!.find((p) => p.name === n);
        const start = get("DTSTART") ? parseIcalDate(get("DTSTART")!, defaultZone) : null;
        const end = get("DTEND") ? parseIcalDate(get("DTEND")!, defaultZone) : null;
        const uid = get("UID")?.value.trim();
        if (start && uid) {
          events.push({
            uid,
            summary: unescapeText(get("SUMMARY")?.value ?? "").trim(),
            description: unescapeText(get("DESCRIPTION")?.value ?? "").trim(),
            location: unescapeText(get("LOCATION")?.value ?? "").trim(),
            url: (get("URL")?.value ?? "").trim(),
            start: start.date,
            end: end?.date ?? null,
            allDay: start.allDay,
            geo: (get("GEO")?.value ?? "").trim(),
            status: (get("STATUS")?.value ?? "").trim().toUpperCase(),
          });
        }
      }
      cur = null;
      continue;
    }
    if (cur) {
      const p = parseLine(line);
      if (p) cur.push(p);
    }
  }
  return events;
}
