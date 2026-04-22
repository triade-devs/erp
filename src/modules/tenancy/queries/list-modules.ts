import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Module = Tables<"modules">;

/**
 * Retorna todos os módulos ativos da plataforma, ordenados por sort_order.
 * Não requer autenticação especial — módulos são legíveis por usuários autenticados.
 */
export async function listModules(): Promise<Module[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  if (error) throw error;

  return data ?? [];
}
