import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RentalWithRelations } from "../types";
import { attachRenters, type RentalRow } from "./list-rentals";

/** Reservas/solicitações do usuário logado na empresa (todas as situações),
 *  mais recentes primeiro — para a tela "Minhas reservas". */
export async function listMyRentals(companyId: string): Promise<RentalWithRelations[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("space_rentals")
    .select("*, spaces(id, name)")
    .eq("company_id", companyId)
    .eq("renter_user_id", user.id)
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);

  return attachRenters((data ?? []) as RentalRow[]);
}
