/* Shared builder for internship items: applies the design's job rules
 * (student title, location, job type, terms, summary/description) in one place. */

import {
  cutDescription,
  inferJobType,
  inferTerms,
  isStudentRole,
  placeJob,
  summarize,
  TERM_NOT_STATED,
  titleTermsAllPast,
} from "../normalize";
import type { SyncItem } from "../types";

export type JobInput = {
  external_id: string;
  source_name: string;
  source_url: string;
  title: string;
  organizer: string;
  organizer_url: string | null;
  url: string;
  posting_site: string | null;
  locations: string[];
  office?: string;
  /** plain text */
  text: string | null;
  /** e.g. Lever's commitment, Greenhouse's "Employment Type"; joins the title for term inference */
  termHints?: string;
  /** the source's structured employment type says intern */
  structuredIntern?: boolean;
  pay?: string | null;
  eligibility?: string | null;
  tags?: string[];
  posted_at: string | null;
  deadline_on?: string | null;
  /** skip the title rule (SimplifyJobs lists internships only) */
  trustTitle?: boolean;
};

/** null when the posting is not a student role, not in Massachusetts / US remote, or for a term that is over. */
export function buildJob(j: JobInput, now: Date): SyncItem | null {
  const title = j.title.replace(/\s+/g, " ").trim();
  if (!title || titleTermsAllPast(title, now)) return null;
  if (!j.trustTitle && !isStudentRole(title, j.structuredIntern)) return null;
  const place = placeJob(j.locations, { office: j.office, text: j.text ?? "" });
  if (!place) return null;
  const terms = inferTerms(`${title} ${j.termHints ?? ""}`, j.text ?? "");
  const jobType = inferJobType(title);
  const description = cutDescription(j.text);
  return {
    external_id: j.external_id,
    source_name: j.source_name,
    source_url: j.source_url,
    kind: "internship",
    title,
    organizer: j.organizer,
    organizer_url: j.organizer_url,
    url: j.url,
    posting_site: j.posting_site,
    summary: summarize(description),
    description,
    area: place.area,
    format: place.format,
    location: place.location,
    starts_on: null,
    ends_on: null,
    deadline_on: j.deadline_on ?? null,
    // new-grad roles have no term, so a missing one is not worth a note
    dates_note: terms.length || jobType === "new_grad" ? null : TERM_NOT_STATED,
    internship_terms: terms,
    job_type: jobType,
    pay: j.pay ?? null,
    eligibility: j.eligibility ?? null,
    tags: j.tags ?? [],
    posted_at: j.posted_at,
  };
}
