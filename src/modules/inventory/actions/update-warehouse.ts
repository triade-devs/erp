"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { warehouseUpdateSchema } from "../schemas/warehouse";

export async function updateWarehouseAction(
  companyId: string,
  warehouseId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:inventory:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar depósitos" };
  }

  const parsed = warehouseUpdateSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("warehouses")
    .update({ name: parsed.data.name })
    .eq("id", warehouseId)
    .eq("company_id", companyId);

  if (error) {
    return { ok: false, message: error.message };
  }

  await audit({
    companyId,
    action: "warehouse.update",
    resourceType: "warehouse",
    resourceId: warehouseId,
    metadata: { name: parsed.data.name },
  });

  revalidatePath(`/[companySlug]/settings/warehouses`);
  return { ok: true, message: "Depósito atualizado com sucesso" };
}
