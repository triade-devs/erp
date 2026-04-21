import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "../types";

export async function getProduct(id: string): Promise<Product | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}
