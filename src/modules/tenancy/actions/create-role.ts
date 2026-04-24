"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { createRoleSchema } from "../schemas/create-role";

function generateCode(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createRoleAction(
  companyId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:role:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar roles" };
  }

  const parsed = createRoleSchema.safeParse({
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
  const code = generateCode(name);

  const supabase = await createClient();

  const { data: role, error } = await supabase
    .from("roles")
    .insert({
      company_id: companyId,
      code,
      name,
      description: description ?? null,
      is_system: false,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Já existe uma role com este nome" };
    }
    return { ok: false, message: error.message };
  }

  await audit({
    companyId,
    action: "role.create",
    resourceType: "role",
    resourceId: role.id,
    status: "success",
  });

  revalidatePath("/", "layout");
  return { ok: true, message: `Role "${name}" criada com sucesso` };
}
