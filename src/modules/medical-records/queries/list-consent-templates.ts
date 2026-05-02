import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MedicalConsentTemplate } from "../types";

export async function listConsentTemplates(companyId: string): Promise<MedicalConsentTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("medical_consent_templates")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("title", { ascending: true })
    .order("version", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
