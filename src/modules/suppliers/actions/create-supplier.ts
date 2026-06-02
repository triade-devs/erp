"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { supplierSchema } from "../schemas";
import type { ActionResult } from "@/lib/errors";

export async function createSupplierAction(
  _prev: ActionResult<{ id: string; name: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = supplierSchema.safeParse(Object.fromEntries(formData));
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
    await requirePermission(companyId, "suppliers:supplier:create");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const { data: inserted, error } = await supabase
    .from("suppliers")
    .insert({
      name: parsed.data.name.toUpperCase(),
      document: parsed.data.document ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      is_active: parsed.data.isActive,
      company_id: companyId,
      created_by: user.id,
    })
    .select("id, name")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Fornecedor cadastrado com sucesso", data: inserted };
}
