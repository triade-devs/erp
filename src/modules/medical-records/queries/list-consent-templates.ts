import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { MedicalConsentTemplate } from "../types";

export async function listConsentTemplates(
  companyId: string,
  opts?: { includeInactive?: boolean },
): Promise<MedicalConsentTemplate[]> {
  const supabase = await createClient();
  let query = supabase
    .from("medical_consent_templates")
    .select("*")
    .eq("company_id", companyId)
    .order("title", { ascending: true })
    .order("version", { ascending: false });

  if (!opts?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
