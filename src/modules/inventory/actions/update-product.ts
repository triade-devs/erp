"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { productSchema } from "../schemas";
import type { ActionResult } from "@/lib/errors";

export async function updateProductAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(Object.fromEntries(formData));
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
    await requirePermission(companyId, "inventory:product:update");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const { error } = await supabase
    .from("products")
    .update({
      sku: parsed.data.sku.toUpperCase(),
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      unit: parsed.data.unit,
      cost_price: parsed.data.costPrice,
      sale_price: parsed.data.salePrice,
      min_stock: parsed.data.minStock,
      is_active: parsed.data.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "SKU já pertence a outro produto" };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Produto atualizado com sucesso" };
}
