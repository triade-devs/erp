"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { createPermissionSchema } from "../schemas/create-permission";
import { audit } from "@/modules/audit";

export async function createPermissionAction(
  moduleCode: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = createPermissionSchema.safeParse({
    code: formData.get("code"),
    resource: formData.get("resource"),
    action: formData.get("action"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase
    .from("permissions")
    .insert({ ...parsed.data, module_code: moduleCode });

  if (error) {
    if (error.code === "23505")
      return { ok: false, message: "Já existe uma permissão com este código" };
    return { ok: false, message: error.message };
  }

  await audit({
    companyId: null,
    action: "platform.permission.create",
    resourceType: "permission",
    resourceId: parsed.data.code,
    metadata: { moduleCode },
  });
  revalidatePath(`/admin/platform/modules/${moduleCode}`);
  return { ok: true, message: `Permissão "${parsed.data.code}" criada` };
}
