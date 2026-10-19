/* Member interest (0005_hackathon_interest.sql): hackathon details and who
 * is going.
 *
 *   InterestList  one line per person: name, "Enrolling" / "Interested"
 *                 pill, their note, when. Names only, never emails (the
 *                 `people` view has none). Used by both cards.
 *   InterestCard  the editors' rail card "Members interested", under
 *                 Verified and above Source on the edit page.
 *
 * Server-safe: no state, no hooks. The members' own card with the toggle is
 * interest-toggle.tsx. */

import { RailCard } from "@/components/admin/edit-layout";
import { TimeAgo } from "@/components/forms/time-ago";
import { Pill } from "@/components/ui/pill";
import { INTEREST_LABELS } from "@/lib/data/locator";
import type { InterestedMember } from "@/lib/data/types";

export function InterestList({
  members,
  empty = "No one yet.",
  selfId,
}: {
  members: InterestedMember[];
  empty?: string;
  /** the viewer's profile id, marked "(you)" */
  selfId?: string | null;
}) {
  if (members.length === 0) return <p className="text-sm text-ink-muted">{empty}</p>;
  return (
    <ul className="flex flex-col divide-y divide-line">
      {members.map((m) => (
        <li key={m.profile_id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 text-sm text-ink [overflow-wrap:anywhere]">
              {m.display_name}
              {selfId && m.profile_id === selfId ? <span className="text-ink-muted"> (you)</span> : null}
            </span>
            <Pill className="flex-none whitespace-nowrap">
              <span className={m.status === "enrolled" ? "text-accent-text" : undefined}>{INTEREST_LABELS[m.status]}</span>
            </Pill>
          </div>
          {m.note ? <p className="text-xs text-ink-muted [overflow-wrap:anywhere]">{m.note}</p> : null}
          <TimeAgo date={m.updated_at} className="text-xs text-ink-muted" />
        </li>
      ))}
    </ul>
  );
}

export function InterestCard({ members }: { members: InterestedMember[] }) {
  return (
    <RailCard title="Members interested">
      <InterestList members={members} />
    </RailCard>
  );
}
