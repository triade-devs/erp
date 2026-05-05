"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function deleteModuleAction(moduleCode: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { data: existing, error: fetchError } = await supabase
    .from("modules")
    .select("code, name, is_system")
    .eq("code", moduleCode)
    .maybeSingle();

  if (fetchError) return { ok: false, message: fetchError.message };
  if (!existing) return { ok: false, message: "Módulo não encontrado" };
  if (existing.is_system)
    return { ok: false, message: "Módulos de sistema não podem ser excluídos" };

  const { error } = await supabase.from("modules").delete().eq("code", moduleCode);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: null,
    action: "platform.module.delete",
    resourceType: "module",
    resourceId: moduleCode,
    metadata: { name: existing.name },
  });

  redirect("/admin/platform/modules");
}
