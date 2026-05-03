"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function updateSystemRolePermissionsAction(
  roleCode: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const permissionCodes = formData.getAll("permission_code") as string[];

  const { error } = await supabase.rpc("update_system_role_permissions", {
    role_code: roleCode,
    permission_codes: permissionCodes,
  });

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: null,
    action: "platform.role.update_system_permissions",
    resourceType: "role",
    resourceId: roleCode,
    metadata: { permissionCount: permissionCodes.length },
  });
  revalidatePath("/admin/platform/roles");
  return {
    ok: true,
    message: `Permissões do role "${roleCode}" atualizadas em todas as empresas`,
  };
}
