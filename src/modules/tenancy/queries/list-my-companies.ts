import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Company = Tables<"companies">;

/**
 * Retorna todas as empresas onde o usuário atual possui membership ativo.
 */
export async function listMyCompanies(): Promise<Company[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("memberships")
    .select("companies(*)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) throw error;

  // Extrai as empresas dos relacionamentos
  const companies: Company[] = [];
  for (const row of data ?? []) {
    if (row.companies) {
      companies.push(row.companies);
    }
  }

  return companies;
}
