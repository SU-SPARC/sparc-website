/* Ashby posting API: GET api.ashbyhq.com/posting-api/job-board/<board>?includeCompensation=true */

import { isoOrNull } from "../normalize";
import type { Adapter } from "../types";
import { buildJob } from "./job";

type Job = {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  isRemote?: boolean;
  isListed?: boolean;
  publishedAt?: string;
  jobUrl: string;
  employmentType?: string;
  descriptionPlain?: string;
  compensation?: { compensationTierSummary?: string | null; scrapeableCompensationSalarySummary?: string | null };
};

export const ashby: Adapter<"ashby"> = {
  kind: "internship",
  sourceName: () => "Ashby",
  prefix: (s) => `ashby:${s.board}:`,
  async fetch(s, { http, now }) {
    const source_url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(s.board)}?includeCompensation=true`;
    const data = await http.json<{ jobs?: Job[] }>(source_url);
    if (!Array.isArray(data.jobs)) throw new Error("unexpected response: no jobs[]");
    const items = data.jobs.flatMap((j) => {
      if (j.isListed === false) return [];
      const locations = [j.location ?? "", ...(j.secondaryLocations ?? []).map((l) => l.location ?? "")];
      if (j.isRemote && !locations.some((l) => /remote/i.test(l))) locations.push(`Remote (${j.location ?? "US"})`);
      const comp = j.compensation?.compensationTierSummary ?? j.compensation?.scrapeableCompensationSalarySummary ?? null;
      const item = buildJob({
        external_id: `ashby:${s.board}:${j.id}`,
        source_name: "Ashby",
        source_url,
        title: j.title,
        organizer: s.company,
        organizer_url: s.careers_url ?? null,
        url: j.jobUrl,
        posting_site: "Ashby",
        locations,
        office: s.office,
        text: j.descriptionPlain ?? null,
        termHints: j.employmentType ?? "",
        structuredIntern: j.employmentType === "Intern",
        pay: comp && /\$/.test(comp) ? comp : null,
        tags: s.tags,
        posted_at: isoOrNull(j.publishedAt),
      }, now);
      return item ? [item] : [];
    });
    return { fetched: data.jobs.length, items };
  },
};
