"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";
import { roleTemplateUpdateSchema } from "../schemas/role-template";

export async function updateRoleTemplateAction(
  code: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = roleTemplateUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("role_templates")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      sort_order: parsed.data.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("code", code);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: null,
    action: "platform.role_template.update",
    resourceType: "role_template",
    resourceId: code,
    status: "success",
  });

  revalidatePath("/admin/platform/role-templates");
  revalidatePath(`/admin/platform/role-templates/${code}`);
  return { ok: true, message: "Template atualizado" };
}
