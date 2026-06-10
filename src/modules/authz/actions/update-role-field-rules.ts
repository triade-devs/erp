"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "../services/authz-service";
import { audit } from "@/modules/audit";
import type { FieldMode } from "../queries/list-role-field-rules";

export type FieldRuleInput = {
  tableName: string;
  columnName: string;
  mode: FieldMode;
};

/**
 * Replace-mode: apaga todas as rules da role e insere as novas (apenas
 * as com mode != 'editable', pois editable = ausência de rule).
 */
export async function updateRoleFieldRulesAction(
  companyId: string,
  roleId: string,
  rules: FieldRuleInput[],
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:role:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar roles" };
  }

  const supabase = await createClient();

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!role) return { ok: false, message: "Role não encontrada" };

  const { error: delErr } = await supabase.from("role_field_rules").delete().eq("role_id", roleId);
  if (delErr) return { ok: false, message: delErr.message };

  const toInsert = rules
    .filter((r) => r.mode !== "editable")
    .map((r) => ({
      role_id: roleId,
      table_name: r.tableName,
      column_name: r.columnName,
      mode: r.mode,
    }));

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from("role_field_rules").insert(toInsert);
    if (insErr) return { ok: false, message: insErr.message };
  }

  await audit({
    companyId,
    action: "role.field_rules_update",
    resourceType: "role",
    resourceId: roleId,
    status: "success",
    metadata: { count: toInsert.length },
  });

  revalidatePath(`/[companySlug]/settings/roles/${roleId}`, "page");
  return { ok: true, message: "Regras de campo atualizadas" };
}
