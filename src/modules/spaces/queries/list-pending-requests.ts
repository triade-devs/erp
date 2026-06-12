import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PendingRequestBatch, RentalWithRelations } from "../types";
import { attachRenters, type RentalRow } from "./list-rentals";

/**
 * Solicitações pendentes da empresa, agrupadas por request_batch_id,
 * para a tela de aprovação do gestor. Pendências com ends_at no passado
 * são marcadas pela UI como expiradas (estado derivado).
 */
export async function listPendingRequests(companyId: string): Promise<PendingRequestBatch[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("space_rentals")
    .select("*, spaces(id, name)")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .not("request_batch_id", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const rentals = await attachRenters((data ?? []) as RentalRow[]);

  const byBatch = new Map<string, RentalWithRelations[]>();
  for (const r of rentals) {
    const key = r.request_batch_id as string;
    const list = byBatch.get(key) ?? [];
    list.push(r);
    byBatch.set(key, list);
  }

  return Array.from(byBatch.entries()).map(([batchId, items]) => {
    const first = items[0];
    return {
      batchId,
      requester: first?.renter ?? null,
      space: first?.spaces ?? null,
      notes: first?.notes ?? null,
      createdAt: first?.created_at ?? "",
      items,
    };
  });
}
