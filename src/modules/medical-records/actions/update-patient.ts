"use server";

import { revalidatePath } from "next/cache";
import { patientSchema } from "../schemas";
import { normalizeDocument } from "../services/clinical-service";
import { ensurePatientAccess, getMedicalActionContext } from "./helpers";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function updatePatientAction(
  patientId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getMedicalActionContext("medical:patient:update");
  if (!ctx.ok) return ctx.result;

  const accessError = await ensurePatientAccess(ctx.supabase, ctx.companyId, patientId);
  if (accessError) return accessError;

  const { error } = await ctx.supabase
    .from("medical_patients")
    .update({
      full_name: parsed.data.fullName,
      document: normalizeDocument(parsed.data.document),
      birth_date: parsed.data.birthDate ?? null,
      sex: parsed.data.sex,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
      emergency_contact_name: parsed.data.emergencyContactName ?? null,
      emergency_contact_phone: parsed.data.emergencyContactPhone ?? null,
      notes: parsed.data.notes ?? null,
      updated_by: ctx.userId,
    })
    .eq("company_id", ctx.companyId)
    .eq("id", patientId);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: ctx.companyId,
    action: "medical.patient.update",
    resourceType: "medical_patient",
    resourceId: patientId,
    permission: "medical:patient:update",
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Paciente atualizado com sucesso" };
}
