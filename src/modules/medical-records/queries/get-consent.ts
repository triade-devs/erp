import "server-only";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MedicalPatientConsent } from "../types";

export async function getConsent(
  companyId: string,
  consentId: string,
): Promise<MedicalPatientConsent> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medical_patient_consents")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", consentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) notFound();
  return data;
}
