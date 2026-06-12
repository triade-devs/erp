"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { rentalSchema } from "../schemas";
import { validateNoOverlap, RentalOverlapError } from "../services/rental-service";
import type { ActionResult } from "@/lib/errors";

export async function createRentalAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = rentalSchema.safeParse(Object.fromEntries(formData));
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
    await requirePermission(companyId, "spaces:rental:create");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const { spaceId, renterUserId, bookingKind, price, notes } = parsed.data;

  // O responsável precisa ser um membro ativo da empresa
  const { data: membership } = await supabase
    .from("memberships")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("user_id", renterUserId)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) {
    return { ok: false, message: "O responsável precisa ser um membro ativo da empresa" };
  }

  // Pré-checagem de conflito (UX) — o banco valida novamente via exclusion constraint
  const { data: existing, error: exErr } = await supabase
    .from("space_rentals")
    .select("starts_at, ends_at")
    .eq("space_id", spaceId)
    .eq("status", "confirmed");
  if (exErr) return { ok: false, message: exErr.message };

  let period: { startsAt: Date; endsAt: Date };
  try {
    period = validateNoOverlap(parsed.data, existing ?? []);
  } catch (e) {
    if (e instanceof RentalOverlapError) return { ok: false, message: e.message };
    throw e;
  }

  const { error } = await supabase.from("space_rentals").insert({
    company_id: companyId,
    space_id: spaceId,
    renter_user_id: renterUserId,
    booking_kind: bookingKind,
    starts_at: period.startsAt.toISOString(),
    ends_at: period.endsAt.toISOString(),
    price,
    notes: notes ?? null,
    created_by: user.id,
  });

  if (error) {
    // 23P01: exclusion_violation disparada pelo constraint space_rentals_no_overlap
    if (error.code === "23P01" || error.message.includes("space_rentals_no_overlap")) {
      return { ok: false, message: new RentalOverlapError().message };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Aluguel registrado com sucesso" };
}
