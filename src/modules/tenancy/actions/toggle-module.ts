"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function toggleModuleAction(
  companyId: string,
  moduleCode: string,
  enable: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  if (enable) {
    const { error } = await supabase.from("company_modules").insert({
      company_id: companyId,
      module_code: moduleCode,
      enabled_by: user.id,
    });
    if (error) return { ok: false, message: error.message };

    // Distribui permissões do módulo nas roles-sistema existentes
    const { data: systemRoles } = await supabase
      .from("roles")
      .select("id, code")
      .eq("company_id", companyId)
      .eq("is_system", true);

    for (const role of systemRoles ?? []) {
      let actionsFilter: string[] = [];
      if (role.code === "owner") {
        // owner ganha tudo
      } else if (role.code === "manager") {
        actionsFilter = ["read", "create", "update", "delete", "export", "approve"];
      } else if (role.code === "operator") {
        actionsFilter = ["read", "create"];
      }

      const { data: perms } = await supabase
        .from("permissions")
        .select("code")
        .eq("module_code", moduleCode)
        .in(
          "action",
          actionsFilter.length
            ? actionsFilter
            : ["read", "create", "update", "delete", "export", "approve", "cancel"],
        );

      if (perms?.length) {
        await supabase.from("role_permissions").upsert(
          perms.map((p) => ({ role_id: role.id, permission_code: p.code })),
          { onConflict: "role_id,permission_code", ignoreDuplicates: true },
        );
      }
    }
  } else {
    const { error } = await supabase
      .from("company_modules")
      .delete()
      .eq("company_id", companyId)
      .eq("module_code", moduleCode);

    if (error) return { ok: false, message: error.message };

    // Remove permissões do módulo de todas as roles da empresa
    const { data: permsToRemove } = await supabase
      .from("permissions")
      .select("code")
      .eq("module_code", moduleCode);

    if (permsToRemove?.length) {
      const { data: companyRoles } = await supabase
        .from("roles")
        .select("id")
        .eq("company_id", companyId);

      const roleIds = (companyRoles ?? []).map((r) => r.id);
      if (roleIds.length) {
        await supabase
          .from("role_permissions")
          .delete()
          .in("role_id", roleIds)
          .in(
            "permission_code",
            permsToRemove.map((p) => p.code),
          );
      }
    }
  }

  await audit({
    companyId,
    action: enable ? "module.enable" : "module.disable",
    resourceType: "module",
    resourceId: moduleCode,
    status: "success",
    metadata: { moduleCode },
  });

  revalidatePath(`/admin/companies/${companyId}/modules`);
  return { ok: true, message: `Módulo ${enable ? "habilitado" : "desabilitado"} com sucesso` };
}
