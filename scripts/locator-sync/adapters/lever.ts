/* Lever postings API: GET api.lever.co/v0/postings/<account>?mode=json (every published posting). */

import { collapseWhitespace, htmlToText, isoOrNull, money } from "../normalize";
import type { Adapter } from "../types";
import { buildJob } from "./job";

type Posting = {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  workplaceType?: string;
  categories?: { location?: string; allLocations?: string[]; commitment?: string; team?: string };
  descriptionPlain?: string;
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
};

function pay(p: Posting): string | null {
  const r = p.salaryRange;
  if (!r || r.currency !== "USD" || r.min == null) return null;
  const unit = /hour/i.test(r.interval ?? "") ? "/hr" : /year|annual/i.test(r.interval ?? "") ? "/yr" : /month/i.test(r.interval ?? "") ? "/month" : "";
  const lo = money(r.min);
  const hi = r.max != null ? money(r.max) : lo;
  return `${lo === hi ? lo : `${lo}–${hi}`}${unit}`;
}

export const lever: Adapter<"lever"> = {
  kind: "internship",
  sourceName: () => "Lever",
  prefix: (s) => `lever:${s.account}:`,
  async fetch(s, { http, now }) {
    const source_url = `https://api.lever.co/v0/postings/${encodeURIComponent(s.account)}?mode=json`;
    const data = await http.json<Posting[]>(source_url);
    if (!Array.isArray(data)) throw new Error("unexpected response: not a list");
    const items = data.flatMap((p) => {
      const c = p.categories ?? {};
      const locations = [...(c.allLocations ?? []), c.location ?? ""];
      if (p.workplaceType === "remote") locations.push(`Remote ${c.location ?? ""}`.trim());
      const lists = (p.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join("\n\n");
      const text = collapseWhitespace([p.descriptionPlain, lists, p.additionalPlain].filter(Boolean).join("\n\n"));
      const item = buildJob({
        external_id: `lever:${s.account}:${p.id}`,
        source_name: "Lever",
        source_url,
        title: p.text,
        organizer: s.company,
        organizer_url: s.careers_url ?? null,
        url: p.hostedUrl,
        posting_site: "Lever",
        locations,
        office: s.office,
        text,
        termHints: c.commitment ?? "",
        structuredIntern: /intern/i.test(c.commitment ?? ""),
        pay: pay(p),
        tags: s.tags,
        posted_at: isoOrNull(p.createdAt),
      }, now);
      return item ? [item] : [];
    });
    return { fetched: data.length, items };
  },
};
