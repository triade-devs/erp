"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";

export async function bulkToggleModuleForCompaniesAction(
  moduleCode: string,
  enable: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) return { ok: false, message: "Não autenticado" };
  const user = data.user;

  if (enable) {
    const { data: companies, error: compErr } = await supabase.from("companies").select("id");

    if (compErr) return { ok: false, message: compErr.message };

    const rows = (companies ?? []).map((c) => ({
      company_id: c.id,
      module_code: moduleCode,
      enabled_by: user.id,
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from("company_modules")
        .upsert(rows, { onConflict: "company_id,module_code", ignoreDuplicates: true });
      if (error) return { ok: false, message: error.message };
    }
  } else {
    const { error } = await supabase.from("company_modules").delete().eq("module_code", moduleCode);

    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/admin/platform/modules");
  return {
    ok: true,
    message: `Módulo ${enable ? "ativado" : "desativado"} para todas as empresas`,
  };
}
