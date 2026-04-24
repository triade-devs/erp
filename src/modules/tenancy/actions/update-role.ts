"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { updateRoleSchema } from "../schemas/update-role";

export async function updateRoleAction(
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

  const parsed = updateRoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { name, description } = parsed.data;

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("roles")
    .select("id, is_system, company_id")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError) return { ok: false, message: fetchError.message };
  if (!existing) return { ok: false, message: "Role não encontrada" };
  if (existing.is_system) return { ok: false, message: "Roles de sistema não podem ser editadas" };

  const { error } = await supabase
    .from("roles")
    .update({ name, description: description ?? null, updated_at: new Date().toISOString() })
    .eq("id", roleId);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId,
    action: "role.update",
    resourceType: "role",
    resourceId: roleId,
    status: "success",
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Role atualizada" };
}
