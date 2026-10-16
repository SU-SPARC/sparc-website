import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DangerZone } from "@/components/admin/edit-client";
import { EditHeader } from "@/components/admin/edit-layout";
import { LinkForm } from "@/components/admin/forms/link-form";
import { StatusBanner } from "@/components/forms/status-banner";
import { deleteLink } from "@/lib/actions/links";
import { editorPage } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit link" };

export default async function EditLink({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const me = await editorPage(`/admin/links/${id}`);
  if (!me) return null;
  const supabase = await createClient();
  const { data: l } = await supabase.from("links").select("*").eq("id", id).maybeSingle();
  if (!l) notFound();

  return (
    <>
      {notice ? <StatusBanner clearParam="notice" className="mb-6">{notice}</StatusBanner> : null}
      <EditHeader section="Links" sectionHref="/admin/links" title={l.label} siteHref={l.published ? "/links" : null} />
      <LinkForm
        d={{
          id: l.id,
          label: l.label,
          url: l.url,
          description: l.description ?? "",
          icon: l.icon ?? "",
          published: l.published,
          created_at: l.created_at,
          updated_at: l.updated_at,
        }}
      />
      <DangerZone noun="link" itemName={l.label} description="Removes this link from /links." deleteAction={deleteLink.bind(null, l.id)} />
    </>
  );
}
