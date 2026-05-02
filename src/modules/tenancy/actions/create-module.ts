"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { createModuleSchema } from "../schemas/create-module";

export async function createModuleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const parsed = createModuleSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    icon: formData.get("icon") || undefined,
    sort_order: formData.get("sort_order"),
    is_system: formData.get("is_system") === "true",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { error } = await supabase.from("modules").insert(parsed.data);

  if (error) {
    if (error.code === "23505")
      return { ok: false, message: "Já existe um módulo com este código" };
    return { ok: false, message: error.message };
  }

  revalidatePath("/admin/platform/modules");
  return { ok: true, message: `Módulo "${parsed.data.name}" criado com sucesso` };
}
