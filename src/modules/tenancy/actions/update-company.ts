"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { updateCompanySchema } from "../schemas/update-company";

/**
 * Server Action para atualizar dados de uma empresa (apenas administradores de plataforma).
 */
export async function updateCompanyAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  // 1. Obtém usuário atual
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  // 2. Verifica permissão de plataforma
  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  // 3. Valida FormData
  const rawData = {
    ...Object.fromEntries(formData),
    document: (formData.get("document") as string | null) || undefined,
  };

  const parsed = updateCompanySchema.safeParse(rawData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { id, name, plan, document, is_active } = parsed.data;

  // 4. Atualiza a empresa
  const { error } = await supabase
    .from("companies")
    .update({
      name,
      plan,
      document: document ?? null,
      is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };

  // 5. Registra audit log
  await supabase.from("audit_logs").insert({
    action: "company.update",
    actor_user_id: user?.id ?? null,
    actor_email: user?.email ?? null,
    resource_type: "company",
    resource_id: id,
    status: "success",
    metadata: { name, plan, is_active },
  });

  revalidatePath("/admin/companies");
  return { ok: true, message: "Empresa atualizada com sucesso" };
}
