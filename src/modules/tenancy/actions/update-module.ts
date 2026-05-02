"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { updateModuleSchema } from "../schemas/update-module";

export async function updateModuleAction(
  code: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = updateModuleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    sort_order: formData.get("sort_order"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("modules").update(parsed.data).eq("code", code);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/platform/modules");
  revalidatePath(`/admin/platform/modules/${code}`);
  return { ok: true, message: "Módulo atualizado" };
}
