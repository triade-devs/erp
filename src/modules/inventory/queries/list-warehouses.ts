import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Warehouse } from "../types";

export async function listWarehouses(companyId: string): Promise<Warehouse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, name, is_active")
    .eq("company_id", companyId)
    .order("name");

  if (error) throw error;
  return (data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    isActive: w.is_active,
  }));
}
