"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { warehouseCreateSchema } from "../schemas/warehouse";

export async function createWarehouseAction(
  companyId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:inventory:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar depósitos" };
  }

  const parsed = warehouseCreateSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .insert({
      company_id: companyId,
      name: parsed.data.name,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  await audit({
    companyId,
    action: "warehouse.create",
    resourceType: "warehouse",
    resourceId: data.id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath(`/[companySlug]/settings/warehouses`);
  return { ok: true, message: "Depósito criado com sucesso" };
}
