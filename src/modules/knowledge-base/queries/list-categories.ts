import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { KbCategory } from "../types";

export async function listCategories(companyId: string): Promise<KbCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kb_categories")
    .select("*")
    .eq("company_id", companyId)
    .order("position", { ascending: true })
    .order("title", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
