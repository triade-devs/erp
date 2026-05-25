"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";

export async function resetRoleFromTemplateAction(
  companyId: string,
  roleId: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  try {
    await requirePermission(companyId, "core:role:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar roles" };
  }

  // Pega o template_code da role
  const { data: role } = await supabase
    .from("roles")
    .select("template_code, code")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!role) return { ok: false, message: "Role não encontrada" };
  if (!role.template_code)
    return { ok: false, message: "Esta role não tem template — nada a resetar" };

  const { error } = await supabase.rpc("apply_template_to_company", {
    p_company: companyId,
    p_template_code: role.template_code,
    p_force: true, // reset assume override
  });

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId,
    action: "role.reset_from_template",
    resourceType: "role",
    resourceId: roleId,
    status: "success",
    metadata: { templateCode: role.template_code },
  });

  revalidatePath(`/[companySlug]/settings/roles`, "page");
  return { ok: true, message: "Role resetada para o template" };
}
