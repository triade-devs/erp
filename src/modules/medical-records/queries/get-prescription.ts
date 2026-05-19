import "server-only";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MedicalPrescriptionWithItems } from "../types";

export async function getPrescription(
  companyId: string,
  prescriptionId: string,
): Promise<MedicalPrescriptionWithItems> {
  const supabase = await createClient();
  const { data: prescription, error } = await supabase
    .from("medical_prescriptions")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", prescriptionId)
    .maybeSingle();

  if (error) throw error;
  if (!prescription) notFound();

  const { data: items, error: itemsError } = await supabase
    .from("medical_prescription_items")
    .select("*")
    .eq("company_id", companyId)
    .eq("prescription_id", prescriptionId)
    .order("position", { ascending: true });

  if (itemsError) throw itemsError;

  return {
    ...prescription,
    medical_prescription_items: items ?? [],
  };
}
