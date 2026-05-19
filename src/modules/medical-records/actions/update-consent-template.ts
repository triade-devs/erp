"use server";

import { revalidatePath } from "next/cache";
import { consentTemplateSchema } from "../schemas";
import { getMedicalActionContext } from "./helpers";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function updateConsentTemplateAction(
  templateId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = consentTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getMedicalActionContext("medical:consent:manage");
  if (!ctx.ok) return ctx.result;

  const { error } = await ctx.supabase
    .from("medical_consent_templates")
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
    })
    .eq("id", templateId)
    .eq("company_id", ctx.companyId);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: ctx.companyId,
    action: "medical.consent_template.update",
    resourceType: "medical_consent_template",
    resourceId: templateId,
    permission: "medical:consent:manage",
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Modelo de termo atualizado com sucesso" };
}
