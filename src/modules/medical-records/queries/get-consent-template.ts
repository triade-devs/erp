import "server-only";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MedicalConsentTemplate } from "../types";

export async function getConsentTemplate(
  companyId: string,
  templateId: string,
): Promise<MedicalConsentTemplate> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medical_consent_templates")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", templateId)
    .maybeSingle();

  if (error) throw error;
  if (!data) notFound();
  return data;
}
