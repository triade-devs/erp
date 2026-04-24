"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";

export async function updateRolePermissionsAction(
  companyId: string,
  roleId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:role:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar roles" };
  }

  const supabase = await createClient();

  const { data: role, error: roleErr } = await supabase
    .from("roles")
    .select("id, is_system, company_id")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (roleErr) return { ok: false, message: roleErr.message };
  if (!role) return { ok: false, message: "Role não encontrada" };
  if (role.is_system)
    return {
      ok: false,
      message: "Permissões de roles de sistema não podem ser alteradas manualmente",
    };

  const [{ data: currentPerms, error: curErr }, { data: enabledModules, error: modErr }] =
    await Promise.all([
      supabase.from("role_permissions").select("permission_code").eq("role_id", roleId),
      supabase.from("company_modules").select("module_code").eq("company_id", companyId),
    ]);

  if (curErr) return { ok: false, message: curErr.message };
  if (modErr) return { ok: false, message: modErr.message };

  const moduleCodes = (enabledModules ?? []).map((m) => m.module_code);

  const { data: validPerms, error: validErr } = await supabase
    .from("permissions")
    .select("code")
    .in("module_code", moduleCodes.length ? moduleCodes : [""]);

  if (validErr) return { ok: false, message: validErr.message };

  const validSet = new Set((validPerms ?? []).map((p) => p.code));
  const currentSet = new Set((currentPerms ?? []).map((p) => p.permission_code));

  const requested = formData.getAll("permission_code") as string[];
  const filteredRequested = requested.filter((code) => validSet.has(code));
  const desiredSet = new Set(filteredRequested);

  const toAdd = filteredRequested.filter((code) => !currentSet.has(code));
  // Só remove perms de módulos habilitados — módulos desabilitados são preservados.
  const toRemove = [...currentSet].filter((code) => !desiredSet.has(code) && validSet.has(code));

  if (toRemove.length > 0) {
    const { error: delErr } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", roleId)
      .in("permission_code", toRemove);

    if (delErr) return { ok: false, message: delErr.message };
  }

  if (toAdd.length > 0) {
    const { error: insErr } = await supabase.from("role_permissions").upsert(
      toAdd.map((code) => ({ role_id: roleId, permission_code: code })),
      { onConflict: "role_id,permission_code", ignoreDuplicates: true },
    );

    if (insErr) return { ok: false, message: insErr.message };
  }

  await audit({
    companyId,
    action: "role.permissions_update",
    resourceType: "role",
    resourceId: roleId,
    status: "success",
    metadata: { added: toAdd, removed: toRemove },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Permissões atualizadas" };
}
