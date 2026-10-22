/* Locator sync: the rules that turn a source's listing into a SyncItem.
 * Pure functions; no network. See docs/LOCATOR-SYNC.md "Normalised item". */

import { createHash } from "node:crypto";

import { CLUB_TZ, isoDateOnly } from "../../lib/data/dates";
import type { DateOnly, InternshipTerm, JobType, OpportunityArea, OpportunityFormat } from "../../lib/data/types";

// ── job filters ──────────────────────────────────────────────────────────

const INTERN_TITLE = /\b(intern|interns|internship|co-?op|apprentice|apprenticeship)\b/i;
const COOP_TITLE = /\bco-?op\b/i;
const NEW_GRAD_TITLE = /\b(new grad(uate)?|university graduate|early career|campus hire)\b/i;
const NOT_STUDENT = /\b(senior|staff|principal|manager|director|lead|freelance|freelancer)\b/i;

/* The club is Programming, AI & Research, so a posting also has to be in a
 * technical field. A title that names a non-technical function (HR, sales,
 * finance, legal, clinical, …) is dropped unless it also names a technical
 * one ("Manufacturing Test Engineer", "Commercial Analytics"). */
const NON_TECH =
  /\b(hr|human resources?|people (ops|operations|team)|talent|recruit\w*|marketing|brand|sales|account (manager|executive)|finance|financial|accounting|accountant|audit|tax|treasury|legal|paralegal|compliance|contracts?|communications?|public relations|public affairs|supply chain|sourcing|procurement|purchasing|logistics|nurs\w+|clinical|pharmac\w+|medical|chemist\w*|biolog\w*|regulatory|quality assurance specialist|market access|commercial|business development|customer (success|support|service)|event|social media|graphic|copywrit\w+|administrative|admin|office|facilities|real estate|merchandis\w+|retail|warehouse|environmental health|ehs|safety|technical writer)\b/i;
const TECH_HINT =
  /\b(software|engineer\w*|developer|programm\w+|data|analytics|analyst|\bai\b|artificial intelligence|machine learning|\bml\b|deep learning|research|scien\w+|cyber\w*|security|cloud|devops|infrastructure|platform|computer|computing|technolog\w+|digital|product|design|ux|ui|hardware|electrical|embedded|firmware|robotics|automation|systems|network|database|quantitative|quant|statistic\w*|math\w*|bioinformatics|information)\b/i;

export function isTechnicalField(title: string): boolean {
  return !NON_TECH.test(title) || TECH_HINT.test(title);
}

/** Not a senior role (senior, staff, principal, manager, director, lead) or freelance gig, and in a technical field. */
export function isEntryLevelTech(title: string): boolean {
  return !NOT_STUDENT.test(title) && isTechnicalField(title);
}

/** Title says intern/co-op/apprentice or new grad (or the source's structured type says intern),
 *  is not a senior role, and is in a technical field. */
export function isStudentRole(title: string, structuredIntern = false): boolean {
  if (!isEntryLevelTech(title)) return false;
  return structuredIntern || INTERN_TITLE.test(title) || NEW_GRAD_TITLE.test(title);
}

/** "co-op" in the title → coop; "new grad", "university graduate", "early career",
 *  "campus hire" → new_grad; anything else → internship (docs/DESIGN-BRIEF.md §17). */
export function inferJobType(title: string): JobType {
  if (COOP_TITLE.test(title)) return "coop";
  if (NEW_GRAD_TITLE.test(title)) return "new_grad";
  return "internship";
}

/** Workday location strings are often facility codes: "US-MA-MARLBOROUGH-MA1 ~ 1001 Boston Post Rd ~ BLDG 1",
 *  "US-NC-REMOTE", "US, MA, Wilmington". Turn them into "Marlborough, MA", "Remote (US)", "Wilmington, MA". */
export function tidyLocation(loc: string): string {
  let l = loc.split(/\s*~\s*/)[0].trim();
  let m = l.match(/^US-([A-Z]{2})-REMOTE\b/i);
  if (m) return `Remote (US)`;
  m = l.match(/^US-([A-Z]{2})-([A-Z][A-Z .'-]+?)(?:-[A-Z0-9]+)*$/i);
  if (m) return `${titleCase(m[2])}, ${m[1].toUpperCase()}`;
  m = l.match(/^US,\s*([A-Z]{2}),\s*(.+)$/i);
  if (m) return `${m[2].trim()}, ${m[1].toUpperCase()}`;
  return l;
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (_, a, c) => a + c.toUpperCase());
}

const MA_WORDS =
  /\b(boston|cambridge|somerville|waltham|burlington|massachusetts|watertown|lexington|bedford|woburn|quincy|newton|framingham|wilmington|andover|marlborough|lowell|needham|wakefield|medford|brookline|chelsea|everett|natick|westford|billerica|chelmsford|saugus|tewksbury|norwood|canton|braintree|amherst|worcester|springfield|plymouth|salem|danvers|devens)\b/i;
const MA_ABBR = /(^|[\s,(])MA(\b|$)/;
const REMOTE = /\bremote\b|\banywhere\b|\bvirtual\b/i;
const HYBRID = /\bhybrid\b/i;

/** Places that make a location non-US, so "Cambridge, UK" and "Remote in Canada" are not ours. */
const FOREIGN =
  /\b(uk|u\.k\.|united kingdom|england|scotland|wales|ireland|canada|ontario|quebec|british columbia|alberta|toronto|vancouver|montreal|mexico|brazil|argentina|colombia|chile|germany|france|spain|portugal|italy|netherlands|belgium|switzerland|austria|poland|czech|romania|serbia|hungary|sweden|norway|denmark|finland|estonia|israel|india|china|japan|korea|singapore|taiwan|hong kong|philippines|vietnam|australia|new zealand|emea|apac|latam|europe|london|berlin|paris|dublin|amsterdam|munich|zurich|tokyo|bangalore|bengaluru|hyderabad|sydney|belgrade|warsaw|krakow|lisbon|madrid|barcelona|stockholm|copenhagen|oslo|helsinki|prague|budapest|bucharest|tel aviv|seoul|beijing|shanghai|shenzhen|mumbai|pune|delhi|chennai|manila|sao paulo|são paulo|mexico city|bogota|buenos aires|melbourne|auckland|cairo|lagos|nairobi|dubai|riyadh|istanbul|edinburgh|cardiff|belfast|galway|cork|ottawa|calgary|waterloo|mississauga)\b/i;
const US_MENTION = /\b(us|u\.s\.|usa|united states|america)\b/i;

const US_STATES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado", CT: "connecticut",
  DE: "delaware", FL: "florida", GA: "georgia", HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa",
  KS: "kansas", KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan",
  MN: "minnesota", MS: "mississippi", MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada", NH: "new hampshire",
  NJ: "new jersey", NM: "new mexico", NY: "new york", NC: "north carolina", ND: "north dakota", OH: "ohio",
  OK: "oklahoma", OR: "oregon", PA: "pennsylvania", RI: "rhode island", SC: "south carolina", SD: "south dakota",
  TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont", VA: "virginia", WA: "washington", WV: "west virginia",
  WI: "wisconsin", WY: "wyoming", DC: "district of columbia",
};
const STATE_NAMES = new RegExp(`\\b(${Object.values(US_STATES).join("|")})\\b`, "i");
const STATE_ABBR = new RegExp(`(?:^|[\\s,])(${Object.keys(US_STATES).join("|")})(?:\\b|$)`);

export function isForeign(loc: string): boolean {
  return FOREIGN.test(loc) && !US_MENTION.test(loc.replace(FOREIGN, ""));
}
export function isMassachusetts(loc: string): boolean {
  if (isForeign(loc)) return false;
  if (MA_ABBR.test(loc) || /massachusetts/i.test(loc)) return true;
  if (!MA_WORDS.test(loc)) return false;
  // "Lexington, KY", "Springfield, IL": a town name shared with another state.
  return !otherState(loc);
}

function otherState(loc: string): boolean {
  const abbr = [...loc.matchAll(new RegExp(STATE_ABBR.source, "g"))].some((m) => m[1] !== "MA");
  const name = [...loc.matchAll(new RegExp(STATE_NAMES.source, "gi"))].some((m) => m[1].toLowerCase() !== "massachusetts");
  return abbr || name;
}
const NYC_WORDS = /\b(new york city|nyc|manhattan|brooklyn|queens|bronx|staten island|long island city|jersey city|hoboken)\b/i;
const NY_OTHER_CITY =
  /\b(rochester|ithaca|albany|buffalo|syracuse|armonk|white plains|tarrytown|purchase|melville|hauppauge|poughkeepsie|yorktown|binghamton|troy|schenectady|utica)\b/i;

/** New York City and its inner commuter towns: "New York, NY", "NYC", "Brooklyn, NY", "Jersey City, NJ".
 *  "New York" on its own counts unless another New York city is named ("Rochester, New York"). */
export function isNewYorkCity(loc: string): boolean {
  if (isForeign(loc)) return false;
  if (NYC_WORDS.test(loc)) return true;
  return /\bnew york\b/i.test(loc) && !NY_OTHER_CITY.test(loc);
}

/** A US place other than (or as well as) Massachusetts. */
export function isUnitedStates(loc: string): boolean {
  if (isForeign(loc)) return false;
  return US_MENTION.test(loc) || STATE_NAMES.test(loc) || STATE_ABBR.test(loc) || isMassachusetts(loc);
}

/** `nyc` marks a New York City placement (area stays "outside_boston"); adapters add the "nyc" tag. */
export type Placement = { area: OpportunityArea; format: OpportunityFormat; location: string; nyc?: boolean };

/** Jobs: keep Massachusetts (or the source's office), New York City, or US remote; drop everything else.
 *  `text` is the posting text, consulted only for "hybrid". */
export function placeJob(locations: string[], opts: { office?: string; text?: string } = {}): Placement | null {
  const locs = [...new Set(locations.map((l) => clean(l)).filter(Boolean))];
  const officeCity = opts.office?.split(/[,/(]/)[0].trim().toLowerCase();
  const local = locs.filter(
    (l) =>
      isMassachusetts(l) ||
      isNewYorkCity(l) ||
      (officeCity && officeCity.length > 2 && l.toLowerCase().includes(officeCity) && !isForeign(l)),
  );
  const hybrid = locs.some((l) => HYBRID.test(l)) || HYBRID.test((opts.text ?? "").slice(0, 4000));
  if (local.length) {
    const area: OpportunityArea = local.some(isMassachusetts) ? "boston" : "outside_boston";
    const nyc = area === "outside_boston" && local.some(isNewYorkCity);
    return { area, format: hybrid ? "hybrid" : "in_person", location: joinLocations(local), ...(nyc ? { nyc: true } : {}) };
  }
  const remote = locs.filter((l) => REMOTE.test(l) && !isForeign(l));
  if (remote.length) return { area: "online", format: "online", location: joinLocations(remote) };
  return null;
}

/** Events: online, Massachusetts (boston), other US (outside_boston); null for anywhere else. */
export function placeEvent(location: string | null, online: boolean): Placement | null {
  const loc = clean(location ?? "");
  if (online || /^(online|virtual|digital)$/i.test(loc)) return { area: "online", format: "online", location: loc || "Online" };
  if (!loc) return null;
  if (isMassachusetts(loc)) return { area: "boston", format: "in_person", location: loc };
  if (isUnitedStates(loc)) return { area: "outside_boston", format: "in_person", location: loc };
  return null;
}

function joinLocations(locs: string[]): string {
  const s = locs.join("; ");
  return s.length > 200 ? `${s.slice(0, 197)}…` : s;
}

// ── terms ────────────────────────────────────────────────────────────────

/** Infer internship terms from the title first, then from supporting text. */
export function inferTerms(title: string, text = ""): InternshipTerm[] {
  const fromTitle = termsIn(title);
  if (fromTitle.length) return fromTitle;
  return termsIn(text.slice(0, 3000));
}

/** The words that name each term, in the order the Locator shows terms. "Co-op" is
 *  not a term any more: inferJobType() reads it as the job type. */
const TERM_WORDS: [InternshipTerm, RegExp][] = [
  ["summer", /\bsummer\b/i],
  ["fall", /\b(fall|autumn)\b/i],
  ["spring", /\bspring\b/i],
  ["winter", /\b(winter|january|winternship)\b/i],
  ["semester_part_time", /\b(part[- ]time|year[- ]round)\b/i],
];

/** Every term the text names: "Co-op (Spring 2027)" → ['spring']. */
export function termsIn(s: string): InternshipTerm[] {
  return TERM_WORDS.filter(([, words]) => words.test(s)).map(([term]) => term);
}

const SEASON_END_MONTH: Record<string, number> = { spring: 5, summer: 8, fall: 12, autumn: 12, winter: 3 };

/** The first day after a named season ends ("Winter 2026" → 2026-03-01, "Fall 2026" → 2027-01-01). */
export function seasonEnd(season: string, year: number): Date {
  return new Date(Date.UTC(year, SEASON_END_MONTH[season.toLowerCase()] ?? 12, 1));
}

/** True when the title names terms with years and every one of them is over ("… Intern - Winter 2026"). */
export function titleTermsAllPast(title: string, now: Date): boolean {
  const ends = [...title.matchAll(/\b(winter|spring|summer|fall|autumn)\b(?:\s*[/&-]\s*(?:winter|spring|summer|fall|autumn)\b)*\s*'?(20\d\d)\b/gi)].map((m) => {
    const seasons = m[0].match(/winter|spring|summer|fall|autumn/gi) ?? [m[1]];
    return seasonEnd(seasons[seasons.length - 1], Number(m[2]));
  });
  return ends.length > 0 && ends.every((d) => d <= now);
}

export const TERM_NOT_STATED = "Term not stated in the posting.";

// ── text ─────────────────────────────────────────────────────────────────

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", hellip: "…", bull: "•", middot: "·", copy: "©", reg: "®", trade: "™",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ent: string) => {
    if (ent[0] === "#") {
      const code = ent[1] === "x" || ent[1] === "X" ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return " ";
      return code === 0xa0 ? " " : String.fromCodePoint(code);
    }
    return NAMED[ent.toLowerCase()] ?? whole;
  });
}

/** HTML (possibly entity-encoded, as Greenhouse sends it) → plain text with paragraph breaks. */
export function htmlToText(html: string): string {
  let s = html;
  if (/&lt;\/?[a-z]/i.test(s) && !/<\/?[a-z]/i.test(s)) s = decodeEntities(s); // encoded markup
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of ["script", "style", "noscript", "svg", "template", "iframe", "head"]) {
    s = s.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), " ");
  }
  s = s
    .replace(/<(br|hr)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/?(p|div|section|article|main|aside|ul|ol|tr|table|h[1-6]|dt|dd|dl|blockquote|pre)\b[^>]*>/gi, "\n")
    .replace(/<\/?(td|th)\b[^>]*>/gi, " ")
    .replace(/<[^>]*>/g, " ");
  return collapseWhitespace(decodeEntities(s));
}

export function collapseWhitespace(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n• *\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** One line, trimmed, inner whitespace collapsed. */
export function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export const DESCRIPTION_MAX = 6000;
export const SUMMARY_MAX = 300;

export function cutDescription(text: string | null | undefined): string | null {
  const t = collapseWhitespace(text ?? "");
  if (!t) return null;
  return t.length > DESCRIPTION_MAX ? `${t.slice(0, DESCRIPTION_MAX - 1).trimEnd()}…` : t;
}

/** First sentence or two of the text, ≤ 300 characters. */
export function summarize(text: string | null | undefined): string | null {
  const t = clean(text ?? "");
  if (!t) return null;
  const sentences = t.match(/[^.!?]+[.!?]+(?=\s|$)/g) ?? [t];
  let out = "";
  for (const s of sentences.slice(0, 2)) {
    const next = `${out} ${s.trim()}`.trim();
    if (next.length > SUMMARY_MAX) break;
    out = next;
  }
  if (!out) out = t.length > SUMMARY_MAX ? `${t.slice(0, SUMMARY_MAX - 1).trimEnd()}…` : t;
  return out;
}

const TAG_OK = /^[a-z0-9][a-z0-9 .+#-]*$/;

/** Lowercase, split on "/" and "&", keep only characters the tag check allows; ≤ `max`. */
export function normalizeTags(raw: (string | null | undefined)[], max = 8): string[] {
  const out: string[] = [];
  for (const r of raw) {
    for (const part of (r ?? "").toLowerCase().split(/[/&,]| and /)) {
      const t = part.replace(/[^a-z0-9 .+#-]/g, " ").replace(/\s+/g, " ").trim();
      if (t && TAG_OK.test(t) && t.length <= 40 && !out.includes(t)) out.push(t);
      if (out.length >= max) return out;
    }
  }
  return out;
}

// ── dates ────────────────────────────────────────────────────────────────

/** The club-zone calendar date of an instant. */
export function dateOf(instant: string | number | Date | null | undefined): DateOnly | null {
  if (instant == null || instant === "") return null;
  const d = instant instanceof Date ? instant : new Date(instant);
  return Number.isNaN(d.getTime()) ? null : isoDateOnly(d);
}

export function isoOrNull(instant: string | number | null | undefined): string | null {
  if (instant == null || instant === "") return null;
  const d = new Date(instant);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function today(now: Date): DateOnly {
  return isoDateOnly(now);
}

export function addDays(date: DateOnly, days: number): DateOnly {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Thu Oct 22, 12:00 PM – 1:00 PM ET" for an event's time of day. */
export function timeNote(start: Date, end: Date | null): string {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: CLUB_TZ, weekday: "short", month: "short", day: "numeric" }).format(start);
  const t = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: CLUB_TZ, hour: "numeric", minute: "2-digit" }).format(d);
  const sameDay = end && isoDateOnly(end) === isoDateOnly(start);
  return `${day}, ${t(start)}${end && sameDay ? ` – ${t(end)}` : ""} ET`;
}

// ── identity ─────────────────────────────────────────────────────────────

export function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function shortHash(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 6);
}

/** `<source id>-<slugified title>-<6 hex of sha1(external_id)>`, ≤ 100 chars, lowercase. */
export function syncSlug(sourceId: string, title: string, externalId: string): string {
  const head = slugify(sourceId);
  const hash = shortHash(externalId);
  const room = 100 - head.length - hash.length - 2;
  const middle = slugify(title).slice(0, Math.max(room, 0)).replace(/-+$/g, "");
  return [head, middle, hash].filter(Boolean).join("-");
}

// ── misc ─────────────────────────────────────────────────────────────────

/** A stable key for "the same posting" across sources: the ATS job id when the URL shows
 *  one (Greenhouse, Lever, Ashby, Workday), else the URL without tracking parameters,
 *  fragment, trailing slash or "www.", lower-cased. The sync uses it to skip rows that
 *  duplicate a curated (seed / manual / import) listing. */
export function postingKey(url: string): string {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return url.trim().toLowerCase();
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const path = u.pathname.replace(/\/+$/, "");
  const ghJid = u.searchParams.get("gh_jid");
  const ghId = ghJid && /^\d+$/.test(ghJid) ? ghJid : /greenhouse\.io$/.test(host) ? (path.match(/\/jobs\/(\d+)/)?.[1] ?? null) : null;
  if (ghId) return `greenhouse:${ghId}`;
  const uuid = path.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i)?.[1]?.toLowerCase();
  if (uuid && /lever\.co$/.test(host)) return `lever:${uuid}`;
  if (uuid && /ashbyhq\.com$/.test(host)) return `ashby:${uuid}`;
  if (/myworkday(jobs|site)\.com$/.test(host)) {
    const req = path.match(/_([A-Za-z0-9-]+)$/)?.[1];
    if (req) return `workday:${host.split(".")[0]}:${req.toUpperCase()}`;
  }
  for (const k of [...u.searchParams.keys()]) {
    if (/^(utm_|ref$|src$|source$|gh_src$|lever-source|ashby_jid$|fbclid$|gclid$)/i.test(k)) u.searchParams.delete(k);
  }
  u.searchParams.sort();
  const q = u.searchParams.toString();
  return `${host}${path.toLowerCase()}${q ? `?${q.toLowerCase()}` : ""}`;
}

/** "Greenhouse", "Lever", … from a posting URL's host; else the bare host. */
export function postingSiteOf(url: string): string | null {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  const known: [RegExp, string][] = [
    [/greenhouse\.io$/, "Greenhouse"],
    [/lever\.co$/, "Lever"],
    [/ashbyhq\.com$/, "Ashby"],
    [/myworkday(jobs|site)\.com$/, "Workday"],
    [/icims\.com$/, "iCIMS"],
    [/smartrecruiters\.com$/, "SmartRecruiters"],
    [/jobvite\.com$/, "Jobvite"],
    [/oraclecloud\.com$/, "Oracle"],
    [/successfactors\.(com|eu)$/, "SuccessFactors"],
    [/linkedin\.com$/, "LinkedIn"],
  ];
  for (const [re, name] of known) if (re.test(host)) return name;
  return host.replace(/^www\./, "");
}

export function money(n: number): string {
  return Number.isInteger(n) ? `$${n.toLocaleString("en-US")}` : `$${n.toFixed(2)}`;
}

export function absoluteUrl(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return base;
  }
}
