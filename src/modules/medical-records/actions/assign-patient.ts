"use server";

import { revalidatePath } from "next/cache";
import { patientAssignmentSchema } from "../schemas";
import { ensurePatientAccess, getMedicalActionContext } from "./helpers";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function assignPatientAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = patientAssignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getMedicalActionContext("medical:patient:assign");
  if (!ctx.ok) return ctx.result;

  const accessError = await ensurePatientAccess(ctx.supabase, ctx.companyId, parsed.data.patientId);
  if (accessError) return accessError;

  const { error } = await ctx.supabase.from("medical_patient_assignments").upsert(
    {
      company_id: ctx.companyId,
      patient_id: parsed.data.patientId,
      membership_id: parsed.data.membershipId,
      relationship: parsed.data.relationship,
      is_primary: parsed.data.isPrimary,
      assigned_by: ctx.userId,
      ended_at: null,
      notes: parsed.data.notes ?? null,
    },
    { onConflict: "company_id,patient_id,membership_id,relationship" },
  );

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: ctx.companyId,
    action: "medical.patient.assign",
    resourceType: "medical_patient",
    resourceId: parsed.data.patientId,
    permission: "medical:patient:assign",
    metadata: { membershipId: parsed.data.membershipId },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Profissional vinculado com sucesso" };
}

export async function endPatientAssignmentAction(
  assignmentId: string,
  _prev: ActionResult,
): Promise<ActionResult> {
  const ctx = await getMedicalActionContext("medical:patient:assign");
  if (!ctx.ok) return ctx.result;

  const { error } = await ctx.supabase
    .from("medical_patient_assignments")
    .update({ ended_at: new Date().toISOString() })
    .eq("company_id", ctx.companyId)
    .eq("id", assignmentId);

  if (error) return { ok: false, message: error.message };
  revalidatePath("/", "layout");
  return { ok: true, message: "Vínculo encerrado" };
}
