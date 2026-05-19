import "server-only";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MedicalPatient, PatientTimeline } from "../types";

export async function getPatientRecord(
  companyId: string,
  patientId: string,
): Promise<{ patient: MedicalPatient; timeline: PatientTimeline }> {
  const supabase = await createClient();

  const { data: patient, error: patientError } = await supabase
    .from("medical_patients")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", patientId)
    .maybeSingle();

  if (patientError) throw patientError;
  if (!patient) notFound();

  const [consultations, prescriptions, consents, assignments] = await Promise.all([
    supabase
      .from("medical_consultations")
      .select("*")
      .eq("company_id", companyId)
      .eq("patient_id", patientId)
      .order("consultation_at", { ascending: false }),
    supabase
      .from("medical_prescriptions")
      .select("*, medical_prescription_items(*)")
      .eq("company_id", companyId)
      .eq("patient_id", patientId)
      .order("issued_at", { ascending: false }),
    supabase
      .from("medical_patient_consents")
      .select("*")
      .eq("company_id", companyId)
      .eq("patient_id", patientId)
      .order("accepted_at", { ascending: false }),
    supabase
      .from("medical_patient_assignments")
      .select("*")
      .eq("company_id", companyId)
      .eq("patient_id", patientId)
      .is("ended_at", null)
      .order("assigned_at", { ascending: false }),
  ]);

  for (const result of [consultations, prescriptions, consents, assignments]) {
    if (result.error) throw result.error;
  }

  return {
    patient,
    timeline: {
      consultations: consultations.data ?? [],
      prescriptions: prescriptions.data ?? [],
      consents: consents.data ?? [],
      assignments: assignments.data ?? [],
    },
  };
}
