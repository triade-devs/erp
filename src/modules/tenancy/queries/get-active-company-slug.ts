import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "../services/active-company";

/**
 * Retorna o slug da empresa ativa para o usuário atual.
 *
 * Utiliza `getActiveCompanyId` para obter o ID da empresa ativa e em seguida
 * busca o slug correspondente. Retorna null se não houver empresa ativa.
 */
export async function getActiveCompanySlug(): Promise<string | null> {
  const companyId = await getActiveCompanyId();
  if (!companyId) return null;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", companyId)
    .single();

  if (error || !data) return null;

  return data.slug;
}
