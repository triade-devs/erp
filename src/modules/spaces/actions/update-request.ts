"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { updateRequestSchema } from "../schemas";
import {
  validateRequestSlots,
  RentalSlotError,
  RentalOverlapError,
} from "../services/rental-service";
import type { ActionResult } from "@/lib/errors";

/** Solicitante edita a própria solicitação PENDENTE (continua pendente).
 *  A RLS garante: só o dono, só resultado pending/cancelled. */
export async function updateRequestAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateRequestSchema.safeParse(Object.fromEntries(formData));
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
    .select("id, space_id, booking_kind, renter_user_id, status")
    .eq("id", parsed.data.rentalId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!rental) return { ok: false, message: "Solicitação não encontrada" };
  if (rental.renter_user_id !== user.id) {
    return { ok: false, message: "Você só pode editar as próprias solicitações" };
  }
  if (rental.status !== "pending") {
    return { ok: false, message: "Apenas solicitações pendentes podem ser editadas" };
  }

  // Conflito contra as demais reservas/pendências do espaço (exclui a própria linha)
  const { data: existing, error: exErr } = await supabase
    .from("space_rentals")
    .select("starts_at, ends_at")
    .eq("space_id", rental.space_id)
    .in("status", ["confirmed", "pending"])
    .neq("id", rental.id);
  if (exErr) return { ok: false, message: exErr.message };

  let periods: { startsAt: Date; endsAt: Date }[];
  try {
    periods = validateRequestSlots(
      rental.booking_kind,
      [{ startsAt: parsed.data.startsAt, endsAt: parsed.data.endsAt }],
      existing ?? [],
    );
  } catch (e) {
    if (e instanceof RentalSlotError) return { ok: false, message: e.message };
    throw e;
  }
  const period = periods[0];
  if (!period) return { ok: false, message: "Período inválido" };

  const { error } = await supabase
    .from("space_rentals")
    .update({
      starts_at: period.startsAt.toISOString(),
      ends_at: period.endsAt.toISOString(),
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rental.id)
    .eq("company_id", companyId)
    .eq("status", "pending");

  if (error) {
    if (error.code === "23P01" || error.message.includes("space_rentals_no_overlap")) {
      return { ok: false, message: new RentalOverlapError().message };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Solicitação atualizada" };
}
