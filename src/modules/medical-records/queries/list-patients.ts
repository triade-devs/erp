import "server-only";

import { createClient } from "@/lib/supabase/server";
import { listPatientsSchema } from "../schemas";
import type { MedicalPatient, PaginatedResult } from "../types";

export async function listPatients(
  companyId: string,
  raw: Record<string, unknown>,
): Promise<PaginatedResult<MedicalPatient>> {
  const { q, page, pageSize, includeArchived } = listPatientsSchema.parse(raw);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  let query = supabase
    .from("medical_patients")
    .select("*", { count: "exact" })
    .eq("company_id", companyId)
    .order("full_name", { ascending: true })
    .range(from, to);

  if (!includeArchived) query = query.eq("is_archived", false);
  if (q) query = query.or(`full_name.ilike.%${q}%,document.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) throw error;

  const total = count ?? 0;
  return {
    data: data ?? [],
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
