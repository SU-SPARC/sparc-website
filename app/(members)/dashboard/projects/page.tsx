/* Projects index for members. */

import type { Metadata } from "next";

import { ProjectsIndex } from "@/components/board/projects-index";
import { ButtonLink } from "@/components/forms/button";
import { StatusBanner } from "@/components/forms/status-banner";
import { requireUser } from "@/lib/auth";
import { listProjectsForMember } from "@/lib/data/pm";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireUser("/dashboard/projects");
  const { notice } = await searchParams;
  const projects = await listProjectsForMember();

  return (
    <div className="flex flex-col gap-6">
      {notice ? <StatusBanner clearParam="notice">{notice}</StatusBanner> : null}
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-ink">Projects</h1>
        <ButtonLink href="/dashboard/projects/new" variant="primary">
          <span className="max-sm:hidden">Request a project</span>
          <span className="sm:hidden">Request</span>
        </ButtonLink>
      </header>
      <ProjectsIndex projects={projects} />
    </div>
  );
}
