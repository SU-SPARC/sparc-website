/* Pending project requests. Editors
 * approve (the RPC builds the board from the methodology template) or
 * decline with a reason. loading/error come from ../ (admin/projects). */

import type { Metadata } from "next";

import { RequestsList } from "@/components/board/requests-list";
import { editorPage } from "@/lib/actions/queries";
import { listMemberCards, listPendingRequests, nextProjectRef } from "@/lib/data/pm";

export const metadata: Metadata = { title: "Requests" };

export default async function RequestsPage() {
  const me = await editorPage("/admin/projects/requests");
  if (!me) return null;
  const [requests, nextRef, cards] = await Promise.all([listPendingRequests(), nextProjectRef(), listMemberCards()]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-baseline gap-3 text-2xl font-medium text-ink">
          Requests <span className="text-base text-ink-muted tabular-nums">{requests.length}</span>
        </h1>
        <p className="text-sm text-ink-muted">Project requests from members, oldest first.</p>
      </header>
      <RequestsList requests={requests} nextRef={nextRef} cards={cards} />
    </div>
  );
}
