"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { hasPermission } from "@/modules/authz";
import { cancelRentalSchema } from "../schemas";
import type { ActionResult } from "@/lib/errors";

export async function cancelRentalAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = cancelRentalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  const { data: rental } = await supabase
    .from("space_rentals")
    .select("id, renter_user_id, status")
    .eq("id", parsed.data.rentalId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!rental) return { ok: false, message: "Aluguel não encontrado" };
  if (rental.status === "cancelled") return { ok: false, message: "Aluguel já cancelado" };

  // Gestor com permissão OU o próprio locatário pode cancelar (espelha a RLS)
  const canCancel =
    rental.renter_user_id === user.id || (await hasPermission(companyId, "spaces:rental:cancel"));
  if (!canCancel) {
    return { ok: false, message: "Acesso negado: permissão insuficiente" };
  }

  const { error } = await supabase
    .from("space_rentals")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", parsed.data.rentalId)
    .eq("company_id", companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Aluguel cancelado" };
}
