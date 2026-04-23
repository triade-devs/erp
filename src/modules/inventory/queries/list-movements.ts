import "server-only";
import { createClient } from "@/lib/supabase/server";
import { listMovementsSchema } from "../schemas";
import type { PaginatedResult, StockMovement } from "../types";

export async function listMovements(
  companyId: string,
  raw: Record<string, unknown>,
): Promise<PaginatedResult<StockMovement>> {
  const { productId, page, pageSize } = listMovementsSchema.parse(raw);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("stock_movements")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (productId) query = query.eq("product_id", productId);

  const { data, count, error } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: data ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
