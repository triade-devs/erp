"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function applyTemplateToCompaniesAction(
  templateCode: string,
  companyIds: string[],
  force: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) throw new AppError("Acesso negado", "ACCESS_DENIED");

  const results: Array<{ companyId: string; ok: boolean; message?: string }> = [];

  for (const companyId of companyIds) {
    const { error } = await supabase.rpc("apply_template_to_company", {
      p_company: companyId,
      p_template_code: templateCode,
      p_force: force,
    });
    results.push({
      companyId,
      ok: !error,
      message: error?.message,
    });
  }

  const failedCount = results.filter((r) => !r.ok).length;

  await audit({
    companyId: null,
    action: "platform.role_template.apply",
    resourceType: "role_template",
    resourceId: templateCode,
    status: failedCount === 0 ? "success" : "error",
    metadata: { companyCount: companyIds.length, failedCount, force, results },
  });

  revalidatePath(`/admin/platform/role-templates/${templateCode}`);
  revalidatePath("/admin/platform/roles");

  if (failedCount > 0) {
    return {
      ok: false,
      message: `Aplicado em ${companyIds.length - failedCount}/${companyIds.length} empresas. ${failedCount} falhou(ram).`,
    };
  }
  return { ok: true, message: `Aplicado em ${companyIds.length} empresas` };
}
