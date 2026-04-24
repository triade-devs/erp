"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { updateCompanySchema } from "../schemas/update-company";
import { audit } from "@/modules/audit";

export async function updateCompanySettingsAction(
  companyId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const rawData = {
    ...Object.fromEntries(formData),
    document: (formData.get("document") as string | null) || undefined,
  };

  const parsed = updateCompanySchema.safeParse(rawData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, document } = parsed.data;

  try {
    await requirePermission(companyId, "core:company:update");
  } catch {
    return { ok: false, message: "Sem permissão para atualizar dados da empresa" };
  }

  const { error } = await supabase
    .from("companies")
    .update({
      name,
      document: document ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId,
    action: "company.update",
    resourceType: "company",
    resourceId: companyId,
    status: "success",
    metadata: { name },
  });

  revalidatePath(`/[companySlug]/settings/general`, "page");
  return { ok: true, message: "Empresa atualizada com sucesso" };
}
