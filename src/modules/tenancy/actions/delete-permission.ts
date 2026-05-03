"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function deletePermissionAction(
  moduleCode: string,
  permissionCode: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { data: deleted, error } = await supabase
    .from("permissions")
    .delete()
    .eq("code", permissionCode)
    .eq("module_code", moduleCode)
    .select("code");

  if (error) return { ok: false, message: error.message };
  if (!deleted || deleted.length === 0) return { ok: false, message: "Permissão não encontrada" };

  await audit({
    companyId: null,
    action: "platform.permission.delete",
    resourceType: "permission",
    resourceId: permissionCode,
    metadata: { moduleCode },
  });
  revalidatePath(`/admin/platform/modules/${moduleCode}`);
  return { ok: true, message: `Permissão "${permissionCode}" removida` };
}
