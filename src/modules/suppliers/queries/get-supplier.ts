import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "../types";

export async function getSupplier(id: string, companyId: string): Promise<Supplier | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (error) return null;
  return data;
}
