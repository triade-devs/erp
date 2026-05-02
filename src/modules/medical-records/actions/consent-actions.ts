"use server";

import { revalidatePath } from "next/cache";
import { consentAcceptSchema, consentTemplateSchema } from "../schemas";
import { buildConsentVersion } from "../services/clinical-service";
import { ensurePatientAccess, getMedicalActionContext } from "./helpers";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function createConsentTemplateAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = consentTemplateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getMedicalActionContext("medical:consent:manage");
  if (!ctx.ok) return ctx.result;

  const { data: existing, error: versionError } = await ctx.supabase
    .from("medical_consent_templates")
    .select("version")
    .eq("company_id", ctx.companyId)
    .eq("title", parsed.data.title)
    .order("version", { ascending: false })
    .limit(1);

  if (versionError) return { ok: false, message: versionError.message };

  const version = buildConsentVersion(existing?.[0]?.version);
  const { data: template, error } = await ctx.supabase
    .from("medical_consent_templates")
    .insert({
      company_id: ctx.companyId,
      title: parsed.data.title,
      body: parsed.data.body,
      version,
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: ctx.companyId,
    action: "medical.consent_template.create",
    resourceType: "medical_consent_template",
    resourceId: template.id,
    permission: "medical:consent:manage",
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Modelo de termo salvo com sucesso" };
}

export async function acceptConsentAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = consentAcceptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getMedicalActionContext("medical:consent:accept");
  if (!ctx.ok) return ctx.result;

  const accessError = await ensurePatientAccess(ctx.supabase, ctx.companyId, parsed.data.patientId);
  if (accessError) return accessError;

  const { data: template, error: templateError } = await ctx.supabase
    .from("medical_consent_templates")
    .select("*")
    .eq("company_id", ctx.companyId)
    .eq("id", parsed.data.templateId)
    .single();

  if (templateError) return { ok: false, message: templateError.message };

  const { data: consent, error } = await ctx.supabase
    .from("medical_patient_consents")
    .insert({
      company_id: ctx.companyId,
      patient_id: parsed.data.patientId,
      template_id: template.id,
      template_title: template.title,
      template_version: template.version,
      accepted_body: template.body,
      accepted_by: ctx.userId,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: ctx.companyId,
    action: "medical.consent.accept",
    resourceType: "medical_patient_consent",
    resourceId: consent.id,
    permission: "medical:consent:accept",
    metadata: { patientId: parsed.data.patientId, templateId: template.id },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Consentimento registrado com sucesso" };
}
