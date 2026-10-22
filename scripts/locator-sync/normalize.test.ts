/* Locator sync: job-type inference from a listing's title (scripts/locator-sync/README.md
 * "Normalised item"). Run with `npm test` (node:test through tsx). */

import assert from "node:assert/strict";
import { test } from "node:test";

import { inferJobType, isStudentRole } from "./normalize";

test("inferJobType: externships come first", () => {
  assert.equal(inferJobType("Software Engineering Externship (Summer 2027)"), "externship");
  assert.equal(inferJobType("Cybersecurity Extern"), "externship");
});

test("inferJobType: co-op, new grad, else internship", () => {
  assert.equal(inferJobType("Data Engineering Co-op"), "coop");
  assert.equal(inferJobType("New Grad Software Engineer"), "new_grad");
  assert.equal(inferJobType("Software Engineer Intern"), "internship");
});

test("inferJobType: 'External' is not an externship", () => {
  assert.equal(inferJobType("External Auditor"), "internship");
});

test("isStudentRole: extern titles count as student roles", () => {
  assert.equal(isStudentRole("Cybersecurity Extern"), true);
  assert.equal(isStudentRole("Senior Engineer"), false);
});

test("isStudentRole / inferJobType: plural extern and intern titles, and near-misses", () => {
  assert.equal(isStudentRole("Summer Externships 2027"), true);
  assert.equal(inferJobType("Summer Externships 2027"), "externship");
  assert.equal(isStudentRole("Summer Internships 2027"), true);
  assert.equal(isStudentRole("External Auditor"), false);
  assert.equal(inferJobType("Externally Facing Intern"), "internship");
});
