import { redirect } from "next/navigation";

import { kindPath } from "@/lib/data/locator";

export default function MemberLocatorIndex() {
  redirect(kindPath("internship", "member"));
}
