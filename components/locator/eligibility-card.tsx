"use client";

/* "Your eligibility" rail card. States: not configured, no profile, idle,
 * checking, result, error. The result is persisted by the action, so a
 * reload shows the same card. No modal, no toast, no progress ring.
 *
 * `mode` picks the audience: "admin" (default) links to the editors'
 * Locator profile and names the env var's doc; "member" links to
 * /dashboard/locator/profile and keeps the not-configured line plain. */

import { Check, CircleCheck, CircleHelp, CircleX, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { RailCard } from "@/components/admin/edit-layout";
import { Button } from "@/components/forms/button";
import { TimeAgo } from "@/components/forms/time-ago";
import { checkEligibility } from "@/lib/actions/locator-ai";
import { type LocatorMode, profilePath, VERDICT_LABELS } from "@/lib/data/locator";
import type { EligibilityCheck, EligibilityVerdict } from "@/lib/data/types";
import { cn } from "@/lib/utils";

const VERDICT_ICON: Record<EligibilityVerdict, { icon: LucideIcon; tone: string }> = {
  eligible: { icon: CircleCheck, tone: "text-success" },
  likely: { icon: CircleCheck, tone: "text-ink" },
  unclear: { icon: CircleHelp, tone: "text-warning" },
  not_eligible: { icon: CircleX, tone: "text-danger" },
};

export interface EligibilityCardProps {
  opportunityId: string;
  initial: EligibilityCheck | null;
  /** Hash of the current listing + profile + model; null when either is missing. */
  currentHash: string | null;
  aiConfigured: boolean;
  hasProfile: boolean;
  /** Editors' or members' screens (links and copy). Default "admin". */
  mode?: LocatorMode;
}

function GlyphList({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: LucideIcon;
  tone?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs text-ink-muted">{title}</h3>
      <ul className="flex flex-col gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-ink">
            <Icon aria-hidden="true" className={cn("mt-[3px] size-3.5 flex-none", tone ?? "text-ink-muted")} />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const NOT_CONFIGURED: Record<LocatorMode, string> = {
  admin: "AI checks need the club’s Anthropic API key on the server. See docs/CMS.md.",
  member: "AI eligibility checks aren’t set up on this site yet. Ask the e-board.",
};

function ProfileLine({ href }: { href: string }) {
  return (
    <>
      <p className="text-sm text-ink-muted">Fill in your Locator profile so the check knows your year, major and goals.</p>
      <Link href={href} className="text-sm text-ink underline underline-offset-4 hover:text-accent-text">
        Locator profile →
      </Link>
    </>
  );
}

export function EligibilityCard({
  opportunityId,
  initial,
  currentHash,
  aiConfigured,
  hasProfile,
  mode = "admin",
}: EligibilityCardProps) {
  const profileHref = profilePath(mode);
  const [result, setResult] = React.useState<EligibilityCheck | null>(initial);
  const [error, setError] = React.useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = React.useState(!hasProfile);
  const [incomplete, setIncomplete] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (!aiConfigured) {
    return (
      <RailCard title="Your eligibility">
        <p className="text-sm text-ink-muted">{NOT_CONFIGURED[mode]}</p>
      </RailCard>
    );
  }
  if (needsProfile) {
    return (
      <RailCard title="Your eligibility">
        <ProfileLine href={profileHref} />
      </RailCard>
    );
  }

  const run = () => {
    setError(null);
    startTransition(async () => {
      const res = await checkEligibility(opportunityId);
      if (res.ok) {
        setResult(res.check);
        setIncomplete(!res.profileComplete);
      } else if (res.code === "no_profile") {
        setNeedsProfile(true);
      } else {
        setError(res.code === "refused" ? "The AI declined to assess this listing." : res.error);
      }
    });
  };

  const status = (
    <p aria-live="polite" className="text-xs text-ink-muted empty:hidden">
      {pending ? "Checking…" : null}
    </p>
  );
  const errorLine = error ? (
    <p role="alert" className="text-xs text-danger">
      {error}
    </p>
  ) : null;

  if (!result) {
    return (
      <RailCard title="Your eligibility">
        <div>
          <Button variant="outline" size="sm" onClick={run} pending={pending} pendingLabel="Checking…">
            Check my eligibility
          </Button>
        </div>
        <p className="text-xs text-ink-muted">Uses your Locator profile and this listing. Takes a few seconds.</p>
        {status}
        {errorLine}
      </RailCard>
    );
  }

  const v = VERDICT_ICON[result.verdict];
  const VerdictIcon = v.icon;
  const stale = currentHash !== null && currentHash !== result.inputs_hash;

  return (
    <RailCard title="Your eligibility">
      <div className="flex flex-col gap-0.5">
        <p className={cn("flex items-center gap-2 text-sm font-medium", v.tone)}>
          <VerdictIcon aria-hidden="true" className="size-4 flex-none" />
          {VERDICT_LABELS[result.verdict]}
        </p>
        <p className="text-xs text-ink-muted">Confidence: {result.confidence}</p>
      </div>
      {stale ? <p className="text-xs text-warning">The listing or your profile changed since this check.</p> : null}
      {incomplete ? (
        <p className="text-xs text-ink-muted">
          Your profile is missing your major, year or goals, so this check is less sure.{" "}
          <Link href={profileHref} className="underline underline-offset-4 hover:text-ink">
            Locator profile
          </Link>
        </p>
      ) : null}
      <GlyphList title="Meets" items={result.reasons} icon={Check} />
      <GlyphList title="Blockers" items={result.blockers} icon={X} tone="text-danger" />
      <GlyphList title="Unknowns" items={result.unknowns} icon={CircleHelp} tone="text-warning" />
      {result.next_steps.length ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-xs text-ink-muted">Next steps</h3>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink marker:text-ink-muted">
            {result.next_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {result.fit_score !== null ? (
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-ink">
            Career fit: <span className="tabular-nums">{result.fit_score}/5</span>
          </p>
          {result.fit_note ? <p className="text-xs text-ink-muted">{result.fit_note}</p> : null}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="text-xs text-ink-muted">
          Checked <TimeAgo date={result.checked_at} />
        </span>
        <Button variant="text" size="sm" onClick={run} pending={pending} pendingLabel="Checking…">
          Re-check
        </Button>
      </div>
      {status}
      {errorLine}
    </RailCard>
  );
}
