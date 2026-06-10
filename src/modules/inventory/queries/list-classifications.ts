import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Classification = Database["public"]["Tables"]["product_classifications"]["Row"];

export async function listClassifications(
  companyId: string,
  level?: "department" | "category" | "brand",
  parentId?: string,
): Promise<Classification[]> {
  const supabase = await createClient();
  let q = supabase.from("product_classifications").select("*").eq("company_id", companyId);
  if (level) q = q.eq("level", level);
  if (parentId) q = q.eq("parent_id", parentId);
  const { data, error } = await q.order("sort_order").order("name");
  if (error) return [];
  return data;
}
