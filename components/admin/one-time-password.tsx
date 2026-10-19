"use client";

/* One-time password screen. Rendered in place of
 * the page content — a full page, not a modal, so a stray click can't
 * dismiss it. The password lives only in this component's props: it is not
 * stored, not in the URL, and gone on reload. Leaving any way other than
 * "I've sent it" triggers beforeunload. */

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { CopyButton, CopyField } from "@/components/forms/copy-field";
import { StatusBanner } from "@/components/forms/status-banner";
import { SurfaceCard } from "@/components/ui/surface-card";

export function OneTimePassword({
  title,
  email,
  name,
  password,
  loginUrl,
  doneNotice,
  warning,
  onDone,
}: {
  title: string;
  email: string;
  name: string;
  password: string;
  loginUrl: string;
  doneNotice: string;
  warning?: string;
  /** Called on "I've sent it" (e.g. to drop the password from state when
   *  the list page stays mounted). */
  onDone?: () => void;
}) {
  const router = useRouter();
  const leaving = React.useRef(false);
  const first = name.split(/\s+/)[0] || email;

  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const message = [
    `Your SPARC account is ready.`,
    `Sign in: ${loginUrl}`,
    `Email: ${email}`,
    `Temporary password: ${password}`,
    `Change it at /dashboard/profile after you sign in.`,
  ].join("\n");

  return (
    <div className="mx-auto flex max-w-text flex-col gap-6">
      <h1 className="text-2xl font-medium text-ink">{title}</h1>
      {warning ? (
        <StatusBanner tone="danger" alert dismissible={false}>
          {warning}
        </StatusBanner>
      ) : null}
      <div role="alert" className="rounded-control border border-warning/40 bg-warning-quiet px-4 py-3 text-sm text-warning">
        Shown once. Copy it now and send it to {first} privately. It can't be shown again.
      </div>
      <SurfaceCard className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-ink">Account</span>
          <span className="rounded-control bg-surface-2 px-3 py-2.5 text-sm text-ink [overflow-wrap:anywhere]">{email}</span>
        </div>
        <CopyField label="Temporary password" value={password} />
        <div>
          <CopyButton text={message} label="Copy sign-in message" copiedLabel="Message copied" />
        </div>
      </SurfaceCard>
      <Button
        variant="primary"
        full
        onClick={() => {
          leaving.current = true;
          onDone?.();
          router.push(`/admin/accounts?notice=${encodeURIComponent(doneNotice)}`);
        }}
      >
        I've sent it
      </Button>
    </div>
  );
}
