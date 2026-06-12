"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

const ADMIN_ACTIONS = ["read", "create", "update", "delete", "export", "approve", "cancel"];
const GESTAO_ACTIONS = ["read", "create", "update", "delete", "export", "approve"];
const OPERACAO_ACTIONS = ["read", "create"];

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

    const { data: modulePerms } = await supabase
      .from("permissions")
      .select("code, action")
      .eq("module_code", moduleCode);

    const modulePermCodes = (modulePerms ?? []).map((p) => p.code);

    // Reativa globalmente perms previamente desativadas (preserva customizações
    // tenant após ciclo disable→enable global do módulo).
    if (modulePermCodes.length) {
      const { error: updErr } = await supabase
        .from("role_permissions")
        .update({ is_active: true })
        .in("permission_code", modulePermCodes);
      if (updErr) return { ok: false, message: updErr.message };
    }

    // Distribui perms-padrão nas roles-sistema (idempotente)
    const { data: systemRoles } = await supabase
      .from("roles")
      .select("id, code")
      .eq("is_system", true);

    const permsByAction = (actions: string[]) =>
      (modulePerms ?? []).filter((p) => actions.includes(p.action)).map((p) => p.code);

    const adminPerms = permsByAction(ADMIN_ACTIONS);
    const gestaoPerms = permsByAction(GESTAO_ACTIONS);
    const operacaoPerms = permsByAction(OPERACAO_ACTIONS);

    const rpRows: { role_id: string; permission_code: string; is_active: boolean }[] = [];
    for (const role of systemRoles ?? []) {
      let perms: string[] = [];
      if (role.code === "admin") perms = adminPerms;
      else if (role.code === "estoque-gestao") perms = gestaoPerms;
      else if (role.code === "estoque-operacao") perms = operacaoPerms;
      for (const perm of perms)
        rpRows.push({ role_id: role.id, permission_code: perm, is_active: true });
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

    // Soft-deactivate global de role_permissions do módulo em todas as empresas
    const { data: permsToDeactivate } = await supabase
      .from("permissions")
      .select("code")
      .eq("module_code", moduleCode);

    if (permsToDeactivate?.length) {
      const permCodes = permsToDeactivate.map((p) => p.code);
      const { error: updErr } = await supabase
        .from("role_permissions")
        .update({ is_active: false })
        .in("permission_code", permCodes);
      if (updErr) return { ok: false, message: updErr.message };
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
