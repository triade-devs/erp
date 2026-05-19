import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Product } from "../types";

export type InventoryStats = {
  totalActive: number;
  lowStockCount: number;
  totalStockValue: number;
  lowStockProducts: Pick<Product, "id" | "name" | "sku" | "stock" | "min_stock" | "unit">[];
};

export async function getInventoryStats(companyId: string): Promise<InventoryStats> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, stock, min_stock, unit, cost_price")
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (error) throw new Error(error.message);

  const products = data ?? [];
  const lowStockProducts = products.filter((p) => Number(p.stock) <= Number(p.min_stock));
  const totalStockValue = products.reduce(
    (sum, p) => sum + Number(p.stock) * Number(p.cost_price),
    0,
  );

  return {
    totalActive: products.length,
    lowStockCount: lowStockProducts.length,
    totalStockValue,
    lowStockProducts: lowStockProducts.slice(0, 5),
  };
}
