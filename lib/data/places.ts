/* Locator places: where a listing is, for the list's "Place" chip row
 * (docs/LOCATOR.md, "List screen"; docs/DESIGN-BRIEF.md §17). Pure, so the
 * client list and the sync script (scripts/locator-sync/normalize.ts) share
 * the New York City test. */

import type { Opportunity, OpportunityKind } from "./types";

const NYC_WORDS = /\b(new york city|nyc|manhattan|brooklyn|queens|bronx|staten island|long island city|jersey city|hoboken)\b/i;
const NY_OTHER_CITY =
  /\b(rochester|ithaca|albany|buffalo|syracuse|armonk|white plains|tarrytown|purchase|melville|hauppauge|poughkeepsie|yorktown|binghamton|troy|schenectady|utica)\b/i;

/** New York City and its inner commuter towns: "New York, NY", "NYC", "Brooklyn, NY", "Jersey City, NJ".
 *  "New York" on its own counts unless another New York city is named ("Rochester, New York").
 *  No foreign-place check here: the sync wraps this with its own `isForeign`. */
export function isNewYorkCity(loc: string): boolean {
  if (NYC_WORDS.test(loc)) return true;
  return /\bnew york\b/i.test(loc) && !NY_OTHER_CITY.test(loc);
}

/** boston = Suffolk or Greater Boston; nyc = New York City; remote = online; elsewhere = other US places. */
export type Place = "boston" | "nyc" | "remote" | "elsewhere";

export const PLACE_ORDER: Place[] = ["boston", "nyc", "remote", "elsewhere"];

/** The list opens on Boston only. */
export const DEFAULT_PLACES: Place[] = ["boston"];

/** The chip labels; the remote chip reads "Remote" for jobs and "Online" for events. */
export function placeLabels(kind: OpportunityKind): Record<Place, string> {
  return { boston: "Boston", nyc: "NYC", remote: kind === "internship" ? "Remote" : "Online", elsewhere: "Elsewhere" };
}

export function placeOf(o: Pick<Opportunity, "area" | "location" | "tags">): Place {
  switch (o.area) {
    case "suffolk":
    case "boston":
      return "boston";
    case "online":
      return "remote";
    case "outside_boston":
      return o.tags.includes("nyc") || isNewYorkCity(o.location ?? "") ? "nyc" : "elsewhere";
  }
}

/** A stored or parsed value → the valid places in it, in PLACE_ORDER; null when it is not an array. */
export function parsePlaces(value: unknown): Place[] | null {
  if (!Array.isArray(value)) return null;
  return PLACE_ORDER.filter((p) => value.includes(p));
}
