"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";
import { roleTemplateCreateSchema } from "../schemas/role-template";

export async function createRoleTemplateAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = roleTemplateCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("role_templates").insert({
    code: parsed.data.code,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    sort_order: parsed.data.sort_order,
    is_system: false,
  });

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: null,
    action: "platform.role_template.create",
    resourceType: "role_template",
    resourceId: parsed.data.code,
    status: "success",
  });

  revalidatePath("/admin/platform/role-templates");
  return { ok: true, message: "Template criado" };
}
