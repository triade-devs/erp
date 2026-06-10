"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function deleteRoleTemplateAction(code: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { data: tpl } = await supabase
    .from("role_templates")
    .select("is_system")
    .eq("code", code)
    .maybeSingle();

  if (!tpl) return { ok: false, message: "Template não encontrado" };
  if (tpl.is_system) return { ok: false, message: "Templates de sistema não podem ser deletados" };

  const { error } = await supabase.from("role_templates").delete().eq("code", code);
  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: null,
    action: "platform.role_template.delete",
    resourceType: "role_template",
    resourceId: code,
    status: "success",
  });

  revalidatePath("/admin/platform/role-templates");
  return { ok: true, message: "Template deletado" };
}
