import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Space } from "../types";

export async function getSpace(companyId: string, spaceId: string): Promise<Space | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", spaceId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
