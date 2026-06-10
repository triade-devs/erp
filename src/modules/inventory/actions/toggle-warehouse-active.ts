"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";

export async function toggleWarehouseActiveAction(
  companyId: string,
  warehouseId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:inventory:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar depósitos" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("warehouses")
    .update({ is_active: isActive })
    .eq("id", warehouseId)
    .eq("company_id", companyId);

  if (error) {
    return { ok: false, message: error.message };
  }

  await audit({
    companyId,
    action: isActive ? "warehouse.activate" : "warehouse.deactivate",
    resourceType: "warehouse",
    resourceId: warehouseId,
  });

  revalidatePath(`/[companySlug]/settings/warehouses`);
  return { ok: true, message: `Depósito ${isActive ? "ativado" : "desativado"} com sucesso` };
}
