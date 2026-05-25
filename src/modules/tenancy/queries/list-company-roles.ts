import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CompanyRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  templateCode: string | null;
  syncedAt: string | null;
  divergent: boolean;
};

export async function listCompanyRoles(companyId: string): Promise<CompanyRole[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select("id, code, name, description, is_system, template_code, template_synced_at")
    .eq("company_id", companyId)
    .order("is_system", { ascending: false })
    .order("name");

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    isSystem: r.is_system,
    templateCode: r.template_code,
    syncedAt: r.template_synced_at,
    divergent: r.template_code !== null && r.template_synced_at === null,
  }));
}
