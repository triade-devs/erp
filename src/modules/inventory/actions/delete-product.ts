"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";

export async function deleteProductAction(
  companySlug: string,
  id: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "inventory:product:delete");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  // Soft delete: apenas inativa o produto (preserva histórico de movimentações)
  const { error } = await supabase
    .from("products")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  redirect(`/${companySlug}/inventory`);
}
