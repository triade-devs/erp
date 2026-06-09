"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";

/** Soft-delete: desativa o espaço (is_active = false). Mantém histórico de aluguéis. */
export async function deactivateSpaceAction(
  spaceId: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "spaces:space:manage");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const { error } = await supabase
    .from("spaces")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", spaceId)
    .eq("company_id", companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Espaço desativado" };
}
