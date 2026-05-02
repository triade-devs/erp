import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type ModuleWithStats = Tables<"modules"> & {
  permissionCount: number;
  activeCompanyCount: number;
};

/**
 * Retorna todos os módulos (ativos e inativos) com estatísticas de permissões e empresas ativas.
 * Usado pela interface administrativa para gerenciar módulos, necessário para visualizar módulos inativos.
 */
export async function listModulesWithStats(): Promise<ModuleWithStats[]> {
  const supabase = await createClient();

  const [
    { data: modules, error: modErr },
    { data: permRows, error: permErr },
    { data: companyRows, error: coErr },
  ] = await Promise.all([
    supabase.from("modules").select("*").order("sort_order"),
    supabase.from("permissions").select("module_code"),
    supabase.from("company_modules").select("module_code"),
  ]);

  if (modErr) throw modErr;
  if (permErr) throw permErr;
  if (coErr) throw coErr;

  const permMap = new Map<string, number>();
  for (const p of permRows ?? []) {
    permMap.set(p.module_code, (permMap.get(p.module_code) ?? 0) + 1);
  }

  const companyMap = new Map<string, number>();
  for (const c of companyRows ?? []) {
    companyMap.set(c.module_code, (companyMap.get(c.module_code) ?? 0) + 1);
  }

  return (modules ?? []).map((m) => ({
    ...m,
    permissionCount: permMap.get(m.code) ?? 0,
    activeCompanyCount: companyMap.get(m.code) ?? 0,
  }));
}
