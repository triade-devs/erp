"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { productSchema } from "../schemas";
import type { ActionResult } from "@/lib/errors";

export async function createProductAction(
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

  const { error } = await supabase.from("products").insert({
    sku: parsed.data.sku.toUpperCase(),
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    unit: parsed.data.unit,
    cost_price: parsed.data.costPrice,
    sale_price: parsed.data.salePrice,
    min_stock: parsed.data.minStock,
    is_active: parsed.data.isActive,
    company_id: companyId,
    created_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "SKU já cadastrado" };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/inventory");
  return { ok: true, message: "Produto cadastrado com sucesso" };
}
