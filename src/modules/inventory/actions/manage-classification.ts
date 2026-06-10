"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { z } from "zod";
import type { ActionResult } from "@/lib/errors";

const createSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(60, "Máximo 60 caracteres"),
  level: z.enum(["department", "category", "brand"]),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.coerce.number().int().default(0),
});

export async function createClassificationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "inventory:product:update");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("product_classifications").insert({
    name: parsed.data.name.toUpperCase(),
    level: parsed.data.level,
    parent_id: parsed.data.parent_id || null,
    sort_order: parsed.data.sort_order,
    company_id: companyId,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Classificação criada com sucesso" };
}

export async function deleteClassificationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get("id") as string;
  if (!id) return { ok: false, message: "ID inválido" };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "inventory:product:update");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_classifications")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
