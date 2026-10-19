/* 403 for a signed-in member who opens /admin: a page inside the
 * public site chrome, no admin shell. */

import { ButtonLink } from "@/components/forms/button";
import { Footer } from "@/components/ui/footer";
import Navbar from "@/components/ui/navbar";

export function AdminForbidden() {
  return (
    <>
      <Navbar />
      <main className="mx-auto flex min-h-[60dvh] max-w-page flex-col items-start justify-center gap-4 px-gutter py-section">
        <p className="text-label uppercase text-ink-muted">403</p>
        <h1 className="text-2xl font-medium text-ink">Admin is for e-board editors.</h1>
        <p className="text-sm text-ink-muted">Your account can edit your own card and work on project boards.</p>
        <ButtonLink href="/dashboard" variant="primary">
          Go to dashboard
        </ButtonLink>
      </main>
      <Footer />
    </>
  );
}
