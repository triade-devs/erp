"use server";

import { revalidatePath } from "next/cache";
import { consultationSchema } from "../schemas";
import { ensurePatientAccess, getMedicalActionContext } from "./helpers";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function createConsultationAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = consultationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getMedicalActionContext("medical:consultation:write");
  if (!ctx.ok) return ctx.result;

  const accessError = await ensurePatientAccess(ctx.supabase, ctx.companyId, parsed.data.patientId);
  if (accessError) return accessError;

  const { data: consultation, error } = await ctx.supabase
    .from("medical_consultations")
    .insert({
      company_id: ctx.companyId,
      patient_id: parsed.data.patientId,
      consultation_at: new Date(parsed.data.consultationAt).toISOString(),
      chief_complaint: parsed.data.chiefComplaint ?? null,
      clinical_evolution: parsed.data.clinicalEvolution ?? null,
      diagnosis_text: parsed.data.diagnosisText ?? null,
      conduct: parsed.data.conduct ?? null,
      notes: parsed.data.notes ?? null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  if (parsed.data.anamnesisSummary) {
    await ctx.supabase.from("medical_anamneses").insert({
      company_id: ctx.companyId,
      patient_id: parsed.data.patientId,
      consultation_id: consultation.id,
      summary: parsed.data.anamnesisSummary,
      answers_json: {},
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });
  }

  await audit({
    companyId: ctx.companyId,
    action: "medical.consultation.create",
    resourceType: "medical_consultation",
    resourceId: consultation.id,
    permission: "medical:consultation:write",
    metadata: { patientId: parsed.data.patientId },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Consulta registrada com sucesso" };
}
