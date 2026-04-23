import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Module = Tables<"modules">;
export type CompanyModuleStatus = Module & { enabled: boolean };

export async function listCompanyModules(companyId: string): Promise<CompanyModuleStatus[]> {
  const supabase = await createClient();

  const [{ data: allModules, error: modErr }, { data: enabledModules, error: cmErr }] =
    await Promise.all([
      supabase.from("modules").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("company_modules").select("module_code").eq("company_id", companyId),
    ]);

  if (modErr) throw modErr;
  if (cmErr) throw cmErr;

  const enabledSet = new Set((enabledModules ?? []).map((r) => r.module_code));

  return (allModules ?? []).map((m) => ({ ...m, enabled: enabledSet.has(m.code) }));
}
