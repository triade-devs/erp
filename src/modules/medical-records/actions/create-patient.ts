"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { patientSchema } from "../schemas";
import { normalizeDocument } from "../services/clinical-service";
import { getMedicalActionContext } from "./helpers";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function createPatientAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = patientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getMedicalActionContext("medical:patient:create");
  if (!ctx.ok) return ctx.result;

  const patientId = randomUUID();
  const { error } = await ctx.supabase.from("medical_patients").insert({
    id: patientId,
    company_id: ctx.companyId,
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
    created_by: ctx.userId,
    updated_by: ctx.userId,
  });

  if (error) return { ok: false, message: error.message };

  const { error: assignmentError } = await ctx.supabase.from("medical_patient_assignments").insert({
    company_id: ctx.companyId,
    patient_id: patientId,
    membership_id: ctx.membershipId,
    relationship: "primary_physician",
    is_primary: true,
    assigned_by: ctx.userId,
  });

  if (assignmentError) return { ok: false, message: assignmentError.message };

  await audit({
    companyId: ctx.companyId,
    action: "medical.patient.create",
    resourceType: "medical_patient",
    resourceId: patientId,
    permission: "medical:patient:create",
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Paciente cadastrado com sucesso" };
}
