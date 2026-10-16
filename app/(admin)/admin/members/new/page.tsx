import type { Metadata } from "next";

import { EditHeader } from "@/components/admin/edit-layout";
import { MemberForm } from "@/components/admin/forms/member-form";
import { editorPage } from "@/lib/actions/queries";

export const metadata: Metadata = { title: "New member" };

function participationYears(): number[] {
  const now = new Date().getFullYear();
  return [now - 2, now - 1, now, now + 1].filter((y) => y >= 2025);
}

export default async function NewMember() {
  const me = await editorPage("/admin/members/new");
  if (!me) return null;
  const year = new Date().getFullYear();
  return (
    <>
      <EditHeader section="Members" sectionHref="/admin/members" title="New member" />
      <MemberForm
        years={participationYears()}
        d={{
          id: null,
          name: "",
          slug: "",
          nickname: "",
          class_year: String(year + 2),
          status: "current",
          role: "",
          role_term: "",
          role_history: [],
          badges: [],
          participated: [year],
          bio: "",
          linkedin: "",
          website: "",
          eboard: false,
          published: true,
          photo: null,
          created_at: null,
          updated_at: null,
          linkedAccount: null,
        }}
      />
    </>
  );
}
