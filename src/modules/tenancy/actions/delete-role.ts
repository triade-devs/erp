"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";

export async function deleteRoleAction(companyId: string, roleId: string): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:role:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar roles" };
  }

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("roles")
    .select("id, is_system, company_id")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError) return { ok: false, message: fetchError.message };
  if (!existing) return { ok: false, message: "Role não encontrada" };
  if (existing.is_system) return { ok: false, message: "Roles de sistema não podem ser excluídas" };

  const { count, error: countError } = await supabase
    .from("membership_roles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", roleId);

  if (countError) return { ok: false, message: countError.message };
  if (count && count > 0) {
    return { ok: false, message: "Esta role possui membros. Reatribua-os antes de excluir." };
  }

  const { error } = await supabase
    .from("roles")
    .delete()
    .eq("id", roleId)
    .eq("company_id", companyId);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId,
    action: "role.delete",
    resourceType: "role",
    resourceId: roleId,
    status: "success",
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Role excluída" };
}
