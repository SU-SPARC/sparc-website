// Pure event helpers, moved unchanged from the old lib/content/events.ts.
// Pure, and `now` is always a parameter. Never call Date.now() at module scope:
// these run at build time in a static export, so a module-scope clock would bake
// the build date into the output.

import type { SparcEvent } from "./types";

/** Events at or after `now`, soonest first. */
export function upcoming(list: SparcEvent[], now: Date): SparcEvent[] {
  return list
    .filter((event) => event.starts_at.getTime() >= now.getTime())
    .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
}

/** Events before `now`, most recent first. */
export function past(list: SparcEvent[], now: Date): SparcEvent[] {
  return list
    .filter((event) => event.starts_at.getTime() < now.getTime())
    .sort((a, b) => b.starts_at.getTime() - a.starts_at.getTime());
}

/**
 * A "Spring 2026"-style label derived from a Date, so the empty state never
 * hardcodes a term (SPEC "/events": hardcoded, it will say "Fall 2026" in 2028).
 * Spring and Fall are the only two labels the repo's own data uses
 * (app/projects/page.tsx: "Spring 2025", "Fall 2025", "Spring 2026"); the split
 * is at August, when the academic year turns over.
 */
export function currentTerm(now: Date): string {
  const term = now.getMonth() >= 7 ? "Fall" : "Spring";
  return `${term} ${now.getFullYear()}`;
}
