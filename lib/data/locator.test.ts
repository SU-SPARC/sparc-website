/* Locator helpers: the Jobs kind (slug "jobs", legacy "internships"), the job
 * types including externship, and the filter keys a job row matches.
 * Run with `npm test` (node:test through tsx). */

import assert from "node:assert/strict";
import { test } from "node:test";

import { JOB_TYPES, JOB_TYPE_LABELS, KIND_CONFIG, jobPillLabels, kindFromSlug, kindPath, rowFilterKeys } from "./locator";
import type { DateOnly, Opportunity } from "./types";

import nextConfig from "../../next.config";

test("kindFromSlug: 'jobs' and the legacy 'internships' both map to the internship kind", () => {
  assert.equal(kindFromSlug("jobs"), "internship");
  assert.equal(kindFromSlug("internships"), "internship");
  assert.equal(kindFromSlug("nope"), null);
});

test("kindPath: the internship kind lives under /jobs", () => {
  assert.equal(kindPath("internship"), "/admin/locator/jobs");
  assert.equal(kindPath("internship", "member"), "/dashboard/locator/jobs");
});

test("KIND_CONFIG.internship reads as Jobs", () => {
  assert.equal(KIND_CONFIG.internship.label, "Jobs");
  assert.equal(KIND_CONFIG.internship.noun, "job");
  assert.equal(KIND_CONFIG.internship.plural, "jobs");
});

test("externship is a job type", () => {
  assert.ok(JOB_TYPES.includes("externship"));
  assert.equal(JOB_TYPE_LABELS.externship, "Externship");
});

test("jobPillLabels: the type pill (unless a plain internship), then the terms", () => {
  assert.deepEqual(jobPillLabels({ job_type: "externship", internship_terms: ["summer"] }), ["Externship", "Summer"]);
  assert.deepEqual(jobPillLabels({ job_type: "internship", internship_terms: [] }), []);
});

test("rowFilterKeys: a job row carries its type key", () => {
  const today: DateOnly = "2026-10-22";
  const row = {
    id: "00000000-0000-0000-0000-000000000001",
    kind: "internship",
    slug: "acme-externship",
    title: "Software Engineering Externship",
    organizer: "Acme",
    organizer_url: null,
    organizer_blurb: null,
    url: "https://example.com/jobs/1",
    posting_site: null,
    summary: null,
    description: null,
    area: "boston",
    format: "in_person",
    location: null,
    starts_on: null,
    ends_on: null,
    deadline_on: null,
    dates_note: null,
    internship_terms: [],
    job_type: "externship",
    pay: null,
    eligibility: null,
    tags: [],
    source: "manual",
    verified_on: null,
    published: true,
    created_at: "2026-10-22T00:00:00Z",
    updated_at: "2026-10-22T00:00:00Z",
    closed_at: null,
    reviewed_at: null,
  } as Opportunity;
  assert.ok(rowFilterKeys(row, today).includes("type:externship"));
});

test("next.config: the old /internships URLs redirect to /jobs, ids included", async () => {
  const redirects = await nextConfig.redirects!();
  for (const base of ["/admin/locator", "/dashboard/locator"]) {
    const rule = redirects.find((r) => r.source === `${base}/internships/:path*`);
    assert.ok(rule, `${base} redirect missing`);
    assert.equal(rule.destination, `${base}/jobs/:path*`);
    assert.equal(rule.permanent, true);
  }
});
