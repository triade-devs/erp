"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { updateCompanySchema } from "../schemas/update-company";
import { audit } from "@/modules/audit";

export async function updateCompanySettingsAction(
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

  const { id, name, plan, document, is_active } = parsed.data;

  try {
    await requirePermission(id, "core:company:update");
  } catch {
    return { ok: false, message: "Sem permissão para atualizar dados da empresa" };
  }

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

  await audit({
    companyId: id,
    action: "company.update",
    resourceType: "company",
    resourceId: id,
    status: "success",
    metadata: { name, plan, is_active },
  });

  revalidatePath(`/[companySlug]/settings/general`, "page");
  return { ok: true, message: "Empresa atualizada com sucesso" };
}
