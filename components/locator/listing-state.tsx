/* ListingState — a listing's state word with its tone: "Closing soon" in
 * warning, "Today" in accent text, Closed / Ended / Deadline passed muted.
 * Under it, the relative line for the primary date ("closes in 7 days") and, for hackathons, the signup line ("Signup closes
 * in 3 days"). `compact` (list rows) sets the word at text-xs and leaves
 * out the relative line: the row's meta already has the date. Server-safe. */

import { listingState, signupState, type StateTone } from "@/lib/data/locator";
import type { DateOnly, Opportunity } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export const STATE_TONE_CLASS: Record<StateTone, string> = {
  ink: "text-ink",
  muted: "text-ink-muted",
  warning: "text-warning",
  accent: "text-accent-text",
};

export interface ListingStateProps {
  opportunity: Opportunity;
  today: DateOnly;
  compact?: boolean;
}

export function ListingState({ opportunity, today, compact = false }: ListingStateProps) {
  const state = listingState(opportunity, today);
  const signup = signupState(opportunity, today);
  const detail = compact ? null : state.detail;
  return (
    <div className="flex flex-col gap-0.5">
      <p className={cn(compact ? "text-xs" : "text-sm", "font-medium", STATE_TONE_CLASS[state.tone])}>{state.word}</p>
      {detail ? <p className="text-xs text-ink-muted">{detail}</p> : null}
      {signup ? <p className="text-xs text-ink-muted">{signup}</p> : null}
    </div>
  );
}
