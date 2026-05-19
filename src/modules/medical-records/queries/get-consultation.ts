import "server-only";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MedicalConsultationWithAnamneses } from "../types";

export async function getConsultation(
  companyId: string,
  consultationId: string,
): Promise<MedicalConsultationWithAnamneses> {
  const supabase = await createClient();
  const { data: consultation, error } = await supabase
    .from("medical_consultations")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", consultationId)
    .maybeSingle();

  if (error) throw error;
  if (!consultation) notFound();

  const { data: anamneses, error: anamnesesError } = await supabase
    .from("medical_anamneses")
    .select("*")
    .eq("company_id", companyId)
    .eq("consultation_id", consultationId)
    .order("created_at", { ascending: true });

  if (anamnesesError) throw anamnesesError;

  return {
    ...consultation,
    medical_anamneses: anamneses ?? [],
  };
}
