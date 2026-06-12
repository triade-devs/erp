import "server-only";
import { createClient } from "@/lib/supabase/server";
import { listSpacesSchema } from "../schemas";
import type { PaginatedResult, Space } from "../types";

export async function listSpaces(
  companyId: string,
  raw: Record<string, unknown>,
): Promise<PaginatedResult<Space>> {
  const { q, page, pageSize, onlyActive, sortBy, sortDir } = listSpacesSchema.parse(raw);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("spaces")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order(sortBy, { ascending: sortDir === "asc" })
    .range(from, to);

  if (onlyActive) query = query.eq("is_active", true);
  if (q) query = query.or(`name.ilike.%${q}%,location.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    data: data ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
