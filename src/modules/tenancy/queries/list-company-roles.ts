import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CompanyRole = {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
};

export async function listCompanyRoles(companyId: string): Promise<CompanyRole[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select("id, code, name, is_system")
    .eq("company_id", companyId)
    .order("is_system", { ascending: false })
    .order("name");

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    isSystem: r.is_system,
  }));
}
