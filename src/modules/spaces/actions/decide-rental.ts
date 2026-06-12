"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { decideRentalSchema } from "../schemas";
import { RentalOverlapError } from "../services/rental-service";
import type { ActionResult } from "@/lib/errors";

export async function decideRentalAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = decideRentalSchema.safeParse(Object.fromEntries(formData));
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

  try {
    await requirePermission(companyId, "spaces:rental:approve");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const { data: rental } = await supabase
    .from("space_rentals")
    .select("id, status")
    .eq("id", parsed.data.rentalId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!rental) return { ok: false, message: "Solicitação não encontrada" };
  if (rental.status !== "pending") {
    return { ok: false, message: "Esta solicitação já foi decidida" };
  }

  const newStatus = parsed.data.decision === "approve" ? "confirmed" : "rejected";
  const { error } = await supabase
    .from("space_rentals")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.rentalId)
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (error) {
    // Defensivo: com pendência travando o slot, conflito aqui não deve ocorrer
    if (error.code === "23P01" || error.message.includes("space_rentals_no_overlap")) {
      return { ok: false, message: new RentalOverlapError().message };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return {
    ok: true,
    message: newStatus === "confirmed" ? "Reserva aprovada" : "Solicitação recusada",
  };
}
