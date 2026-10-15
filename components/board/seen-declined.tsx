"use client";

/* Declined requests are shown on the dashboard once: after the page has
 * rendered them, their ids go into a cookie the server reads next time
 * (document.cookie, so no server round trip refreshes this view away). */

import * as React from "react";

import { SEEN_DECLINED_COOKIE } from "./board-utils";

export function MarkDeclinedSeen({ ids, seen }: { ids: string[]; seen: string[] }) {
  React.useEffect(() => {
    if (!ids.length) return;
    const all = [...new Set([...seen, ...ids])].slice(-50);
    document.cookie = `${SEEN_DECLINED_COOKIE}=${all.join(".")}; path=/dashboard; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
  }, [ids, seen]);
  return null;
}
