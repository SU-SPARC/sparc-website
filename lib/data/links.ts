import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import { toLink } from "./mappers";
import type { Link } from "./types";

/** Published links for /links, by sort_order. */
export async function getLinks(): Promise<Link[]> {
  const { data, error } = await createPublicClient()
    .from("links")
    .select("*")
    .eq("published", true)
    .order("sort_order")
    .order("label");
  if (error) throw new Error(`getLinks: ${error.message}`);
  return data.map(toLink);
}
