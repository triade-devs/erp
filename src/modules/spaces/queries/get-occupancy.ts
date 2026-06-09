import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RentalWithRelations } from "../types";
import { attachRenters, type RentalRow } from "./list-rentals";

/**
 * Aluguéis confirmados que tocam o intervalo [from, to) — usado para pintar os
 * calendários (por espaço quando `spaceId` é informado, ou agregado da empresa).
 */
export async function getOccupancy(
  companyId: string,
  range: { from: Date; to: Date },
  spaceId?: string,
): Promise<RentalWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("space_rentals")
    .select("*, spaces(id, name)")
    .eq("company_id", companyId)
    .eq("status", "confirmed")
    // Sobreposição com a janela consultada: começa antes do fim E termina depois do início
    .lt("starts_at", range.to.toISOString())
    .gt("ends_at", range.from.toISOString())
    .order("starts_at", { ascending: true });

  if (spaceId) query = query.eq("space_id", spaceId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return attachRenters((data ?? []) as RentalRow[]);
}
