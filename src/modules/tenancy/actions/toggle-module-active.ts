"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function toggleModuleActiveAction(
  code: string,
  isActive: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { error } = await supabase.from("modules").update({ is_active: isActive }).eq("code", code);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: null,
    action: "platform.module.toggle_active",
    resourceType: "module",
    resourceId: code,
    metadata: { isActive },
  });
  revalidatePath("/admin/platform/modules");
  return { ok: true, message: `Módulo ${isActive ? "ativado" : "desativado"} no catálogo` };
}
