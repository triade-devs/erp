import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PaginatedResult, RentalWithRelations, SpaceRental } from "../types";

/** Linha crua de space_rentals com o espaço embutido (antes do merge do responsável). */
export type RentalRow = SpaceRental & { spaces: { id: string; name: string } | null };

type ListRentalsParams = {
  spaceId?: string;
  page?: number;
  pageSize?: number;
  includeCancelled?: boolean;
};

/** Aluguéis de um espaço (ou da empresa), paginados, mais recentes primeiro. */
export async function listRentals(
  companyId: string,
  params: ListRentalsParams = {},
): Promise<PaginatedResult<RentalWithRelations>> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("space_rentals")
    .select("*, spaces(id, name)", { count: "exact" })
    .eq("company_id", companyId)
    .order("starts_at", { ascending: false })
    .range(from, to);

  if (params.spaceId) query = query.eq("space_id", params.spaceId);
  if (!params.includeCancelled) query = query.eq("status", "confirmed");

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  const withRenters = await attachRenters((data ?? []) as RentalRow[]);
  const total = count ?? 0;
  return {
    data: withRenters,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Anexa o nome do responsável (profiles) aos aluguéis. Não há FK direto de
 * space_rentals para profiles (a FK aponta para auth.users), então buscamos os
 * perfis dos locatários e fazemos o merge aqui.
 */
export async function attachRenters(rentals: RentalRow[]): Promise<RentalWithRelations[]> {
  if (rentals.length === 0) return [];
  const supabase = await createClient();
  const ids = Array.from(new Set(rentals.map((r) => r.renter_user_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rentals.map((r) => ({
    ...r,
    spaces: r.spaces ?? null,
    renter: byId.get(r.renter_user_id) ?? null,
  }));
}
