"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { spaceSchema } from "../schemas";
import type { ActionResult } from "@/lib/errors";

export async function createSpaceAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = spaceSchema.safeParse(Object.fromEntries(formData));
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
    await requirePermission(companyId, "spaces:space:manage");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const { error } = await supabase.from("spaces").insert({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    location: parsed.data.location ?? null,
    capacity: parsed.data.capacity ?? null,
    default_price: parsed.data.defaultPrice,
    booking_mode: parsed.data.bookingMode,
    is_active: parsed.data.isActive,
    company_id: companyId,
    created_by: user.id,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Espaço cadastrado com sucesso" };
}
