import "server-only";
import { createClient } from "@/lib/supabase/server";
import { listMovementsSchema } from "../schemas";
import type { MovementWithProduct, PaginatedResult } from "../types";

export async function listMovements(
  companyId: string,
  raw: Record<string, unknown>,
): Promise<PaginatedResult<MovementWithProduct>> {
  const { productId, page, pageSize, sortBy, sortDir } = listMovementsSchema.parse(raw);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("stock_movements")
    .select("*, products(name, sku)", { count: "exact" })
    .eq("company_id", companyId)
    .order(sortBy, { ascending: sortDir === "asc" })
    .range(from, to);

  if (productId) query = query.eq("product_id", productId);

  const { data, count, error } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: (data ?? []) as MovementWithProduct[],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
