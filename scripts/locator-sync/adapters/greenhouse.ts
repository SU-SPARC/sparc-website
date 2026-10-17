/* Greenhouse job board API: GET boards-api.greenhouse.io/v1/boards/<token>/jobs?content=true&pay_transparency=true
 * One request returns every open job with its HTML content (entity-encoded). */

import { htmlToText, isoOrNull, money } from "../normalize";
import type { Adapter } from "../types";
import { buildJob } from "./job";

type Job = {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  first_published?: string;
  location?: { name?: string };
  offices?: { name?: string; location?: string | null }[];
  content?: string;
  metadata?: { name: string; value: unknown }[] | null;
  pay_input_ranges?: { min_cents: number; max_cents: number; currency_type: string; title?: string }[];
};

function pay(job: Job): string | null {
  const r = job.pay_input_ranges?.[0];
  if (!r || r.currency_type !== "USD") return null;
  const t = (r.title ?? "").toLowerCase();
  const unit = /hour/.test(t) ? "/hr" : /week/.test(t) ? "/week" : /month/.test(t) ? "/month" : /annual|year|salary/.test(t) ? "/yr" : "";
  const lo = money(r.min_cents / 100);
  const hi = money(r.max_cents / 100);
  return `${lo === hi ? lo : `${lo}–${hi}`}${unit}`;
}

export const greenhouse: Adapter<"greenhouse"> = {
  kind: "internship",
  sourceName: () => "Greenhouse",
  prefix: (s) => `greenhouse:${s.token}:`,
  async fetch(s, { http, now }) {
    const source_url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(s.token)}/jobs?content=true&pay_transparency=true`;
    const data = await http.json<{ jobs?: Job[] }>(source_url);
    if (!Array.isArray(data.jobs)) throw new Error("unexpected response: no jobs[]");
    const items = data.jobs.flatMap((j) => {
      const type = j.metadata?.find((m) => /employment type/i.test(m.name))?.value;
      const item = buildJob({
        external_id: `greenhouse:${s.token}:${j.id}`,
        source_name: "Greenhouse",
        source_url,
        title: j.title,
        organizer: s.company,
        organizer_url: s.careers_url ?? null,
        url: j.absolute_url,
        posting_site: "Greenhouse",
        locations: [j.location?.name ?? "", ...(j.offices ?? []).map((o) => o.location ?? o.name ?? "")],
        office: s.office,
        text: j.content ? htmlToText(j.content) : null,
        termHints: typeof type === "string" ? type : "",
        structuredIntern: typeof type === "string" && /^intern(ship)?$/i.test(type),
        pay: pay(j),
        tags: s.tags,
        posted_at: isoOrNull(j.first_published ?? j.updated_at),
      }, now);
      return item ? [item] : [];
    });
    return { fetched: data.jobs.length, items };
  },
};
