"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";

export async function updateRoleScopesAction(
  companyId: string,
  roleId: string,
  dimensionCode: string,
  scopeValues: string[],
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:role:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar roles" };
  }

  const supabase = await createClient();

  const { data: role, error: roleError } = await supabase
    .from("roles")
    .select("id")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (roleError) {
    return { ok: false, message: roleError.message };
  }

  if (!role) {
    return { ok: false, message: "Role não encontrada" };
  }

  const { error } = await supabase.rpc("set_role_scopes", {
    p_company_id: companyId,
    p_role_id: roleId,
    p_dimension_code: dimensionCode,
    p_scope_values: scopeValues,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  await audit({
    companyId,
    action: "role.scopes.update",
    resourceType: "role",
    resourceId: roleId,
    metadata: { dimensionCode, scopeValues },
  });

  revalidatePath(`/[companySlug]/settings/roles`);
  return { ok: true, message: "Escopos atualizados com sucesso" };
}
