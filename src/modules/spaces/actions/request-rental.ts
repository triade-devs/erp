"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { requestRentalSchema } from "../schemas";
import {
  validateRequestSlots,
  RentalSlotError,
  RentalOverlapError,
} from "../services/rental-service";
import type { ActionResult } from "@/lib/errors";

export async function requestRentalAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = requestRentalSchema.safeParse(Object.fromEntries(formData));
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
    await requirePermission(companyId, "spaces:rental:request");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const { spaceId, bookingKind, slots, notes } = parsed.data;

  // Espaço precisa existir, estar ativo e aceitar o tipo de reserva
  const { data: space } = await supabase
    .from("spaces")
    .select("id, is_active, booking_mode, default_price")
    .eq("id", spaceId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!space || !space.is_active) return { ok: false, message: "Espaço não encontrado ou inativo" };
  if (space.booking_mode !== "both" && space.booking_mode !== bookingKind) {
    return { ok: false, message: "Este espaço não aceita este tipo de reserva" };
  }

  // Pré-checagem de conflito contra pendentes + confirmadas (UX)
  const { data: existing, error: exErr } = await supabase
    .from("space_rentals")
    .select("starts_at, ends_at")
    .eq("space_id", spaceId)
    .in("status", ["confirmed", "pending"]);
  if (exErr) return { ok: false, message: exErr.message };

  let periods: { startsAt: Date; endsAt: Date }[];
  try {
    periods = validateRequestSlots(bookingKind, slots, existing ?? []);
  } catch (e) {
    if (e instanceof RentalSlotError) return { ok: false, message: e.message };
    throw e;
  }

  const batchId = randomUUID();
  const { error } = await supabase.from("space_rentals").insert(
    periods.map((p) => ({
      company_id: companyId,
      space_id: spaceId,
      renter_user_id: user.id,
      booking_kind: bookingKind,
      starts_at: p.startsAt.toISOString(),
      ends_at: p.endsAt.toISOString(),
      price: space.default_price,
      status: "pending" as const,
      request_batch_id: batchId,
      notes: notes ?? null,
      created_by: user.id,
    })),
  );

  if (error) {
    if (error.code === "23P01" || error.message.includes("space_rentals_no_overlap")) {
      return { ok: false, message: new RentalOverlapError().message };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  const n = periods.length;
  return { ok: true, message: `Solicitação enviada (${n} ${n === 1 ? "horário" : "horários"})` };
}
