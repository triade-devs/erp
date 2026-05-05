"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

const OWNER_ACTIONS = ["read", "create", "update", "delete", "export", "approve", "cancel"];
const MANAGER_ACTIONS = ["read", "create", "update", "delete", "export", "approve"];
const OPERATOR_ACTIONS = ["read", "create"];

export async function bulkToggleModuleForCompaniesAction(
  moduleCode: string,
  enable: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return { ok: false, message: "Não autenticado" };
  const user = data.user;

  if (enable) {
    const { data: companies, error: compErr } = await supabase.from("companies").select("id");
    if (compErr) return { ok: false, message: compErr.message };

    const rows = (companies ?? []).map((c) => ({
      company_id: c.id,
      module_code: moduleCode,
      enabled_by: user.id,
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("company_modules")
        .upsert(rows, { onConflict: "company_id,module_code", ignoreDuplicates: true });
      if (error) return { ok: false, message: error.message };
    }

    // Distribui permissões do módulo nas roles-sistema de todas as empresas
    const [{ data: allPerms }, { data: systemRoles }] = await Promise.all([
      supabase.from("permissions").select("code, action").eq("module_code", moduleCode),
      supabase.from("roles").select("id, code").eq("is_system", true),
    ]);

    const permsByAction = (actions: string[]) =>
      (allPerms ?? []).filter((p) => actions.includes(p.action)).map((p) => p.code);

    const ownerPerms = permsByAction(OWNER_ACTIONS);
    const managerPerms = permsByAction(MANAGER_ACTIONS);
    const operatorPerms = permsByAction(OPERATOR_ACTIONS);

    const rpRows: { role_id: string; permission_code: string }[] = [];
    for (const role of systemRoles ?? []) {
      let perms: string[] = [];
      if (role.code === "owner") perms = ownerPerms;
      else if (role.code === "manager") perms = managerPerms;
      else if (role.code === "operator") perms = operatorPerms;
      for (const perm of perms) rpRows.push({ role_id: role.id, permission_code: perm });
    }

    if (rpRows.length > 0) {
      const { error } = await supabase
        .from("role_permissions")
        .upsert(rpRows, { onConflict: "role_id,permission_code", ignoreDuplicates: true });
      if (error) return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("company_modules").delete().eq("module_code", moduleCode);
    if (error) return { ok: false, message: error.message };

    // Remove permissões do módulo de todas as roles de todas as empresas
    const { data: permsToRemove } = await supabase
      .from("permissions")
      .select("code")
      .eq("module_code", moduleCode);

    if (permsToRemove?.length) {
      const permCodes = permsToRemove.map((p) => p.code);
      const { error: delErr } = await supabase
        .from("role_permissions")
        .delete()
        .in("permission_code", permCodes);
      if (delErr) return { ok: false, message: delErr.message };
    }
  }

  await audit({
    companyId: null,
    action: enable ? "platform.module.bulk_enable" : "platform.module.bulk_disable",
    resourceType: "module",
    resourceId: moduleCode,
  });
  revalidatePath("/admin/platform/modules");
  return {
    ok: true,
    message: `Módulo ${enable ? "ativado" : "desativado"} para todas as empresas`,
  };
}
