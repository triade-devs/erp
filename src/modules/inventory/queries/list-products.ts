import "server-only";
import { createClient } from "@/lib/supabase/server";
import { listProductsSchema } from "../schemas";
import type { PaginatedResult, Product } from "../types";

export async function listProducts(
  companyId: string,
  raw: Record<string, unknown>,
): Promise<PaginatedResult<Product>> {
  const { q, page, pageSize, onlyActive, sortBy, sortDir } = listProductsSchema.parse(raw);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order(sortBy, { ascending: sortDir === "asc" })
    .range(from, to);

  if (onlyActive) query = query.eq("is_active", true);
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);

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
