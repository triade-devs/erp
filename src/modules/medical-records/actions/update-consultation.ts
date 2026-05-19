"use server";

import { revalidatePath } from "next/cache";
import { consultationSchema } from "../schemas";
import { ensurePatientAccess, getMedicalActionContext } from "./helpers";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function updateConsultationAction(
  consultationId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = consultationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getMedicalActionContext("medical:consultation:write");
  if (!ctx.ok) return ctx.result;

  const accessError = await ensurePatientAccess(ctx.supabase, ctx.companyId, parsed.data.patientId);
  if (accessError) return accessError;

  const { error } = await ctx.supabase
    .from("medical_consultations")
    .update({
      consultation_at: new Date(parsed.data.consultationAt).toISOString(),
      chief_complaint: parsed.data.chiefComplaint ?? null,
      clinical_evolution: parsed.data.clinicalEvolution ?? null,
      diagnosis_text: parsed.data.diagnosisText ?? null,
      conduct: parsed.data.conduct ?? null,
      notes: parsed.data.notes ?? null,
      updated_by: ctx.userId,
    })
    .eq("id", consultationId)
    .eq("company_id", ctx.companyId);

  if (error) return { ok: false, message: error.message };

  const { data: existingAnamnesis, error: anamnesisLookupError } = await ctx.supabase
    .from("medical_anamneses")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("consultation_id", consultationId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (anamnesisLookupError) return { ok: false, message: anamnesisLookupError.message };

  const summary = parsed.data.anamnesisSummary ?? null;
  if (existingAnamnesis) {
    const { error: anamnesisUpdateError } = await ctx.supabase
      .from("medical_anamneses")
      .update({
        summary,
        updated_by: ctx.userId,
      })
      .eq("id", existingAnamnesis.id)
      .eq("company_id", ctx.companyId);

    if (anamnesisUpdateError) return { ok: false, message: anamnesisUpdateError.message };
  } else if (summary) {
    const { error: anamnesisInsertError } = await ctx.supabase.from("medical_anamneses").insert({
      company_id: ctx.companyId,
      patient_id: parsed.data.patientId,
      consultation_id: consultationId,
      summary,
      answers_json: {},
      created_by: ctx.userId,
      updated_by: ctx.userId,
    });

    if (anamnesisInsertError) return { ok: false, message: anamnesisInsertError.message };
  }

  await audit({
    companyId: ctx.companyId,
    action: "medical.consultation.update",
    resourceType: "medical_consultation",
    resourceId: consultationId,
    permission: "medical:consultation:write",
    metadata: { patientId: parsed.data.patientId },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Consulta atualizada com sucesso" };
}
