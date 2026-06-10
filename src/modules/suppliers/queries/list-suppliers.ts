import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Supplier } from "../types";

export async function listSuppliers(
  companyId: string,
  options: { onlyActive?: boolean } = {},
): Promise<Supplier[]> {
  const supabase = await createClient();
  let q = supabase.from("suppliers").select("*").eq("company_id", companyId);
  if (options.onlyActive) q = q.eq("is_active", true);
  const { data, error } = await q.order("name");
  if (error) return [];
  return data;
}
