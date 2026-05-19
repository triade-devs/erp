"use server";

import { revalidatePath } from "next/cache";
import { prescriptionSchema } from "../schemas";
import { compactPrescriptionItems } from "../services/clinical-service";
import { ensurePatientAccess, getMedicalActionContext } from "./helpers";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function createPrescriptionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  try {
    raw.items = JSON.parse(String(raw.items ?? "[]"));
  } catch {
    return { ok: false, fieldErrors: { items: ["Itens da prescrição inválidos"] } };
  }

  const parsed = prescriptionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };

  const ctx = await getMedicalActionContext("medical:prescription:write");
  if (!ctx.ok) return ctx.result;

  const accessError = await ensurePatientAccess(ctx.supabase, ctx.companyId, parsed.data.patientId);
  if (accessError) return accessError;

  const { data: prescription, error } = await ctx.supabase
    .from("medical_prescriptions")
    .insert({
      company_id: ctx.companyId,
      patient_id: parsed.data.patientId,
      consultation_id: parsed.data.consultationId ?? null,
      general_instructions: parsed.data.generalInstructions ?? null,
      created_by: ctx.userId,
      updated_by: ctx.userId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  const items = compactPrescriptionItems(parsed.data.items).map((item) => ({
    prescription_id: prescription.id,
    company_id: ctx.companyId,
    medication: item.medication,
    dosage: item.dosage ?? null,
    route: item.route ?? null,
    frequency: item.frequency ?? null,
    duration: item.duration ?? null,
    quantity: item.quantity ?? null,
    instructions: item.instructions ?? null,
    position: item.position,
  }));

  const { error: itemsError } = await ctx.supabase.from("medical_prescription_items").insert(items);
  if (itemsError) return { ok: false, message: itemsError.message };

  await audit({
    companyId: ctx.companyId,
    action: "medical.prescription.create",
    resourceType: "medical_prescription",
    resourceId: prescription.id,
    permission: "medical:prescription:write",
    metadata: { patientId: parsed.data.patientId, items: items.length },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Prescrição criada com sucesso" };
}
