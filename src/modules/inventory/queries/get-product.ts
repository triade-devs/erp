import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "../types";

export async function getProduct(id: string, companyId: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();

  if (error) return null;
  return data;
}
