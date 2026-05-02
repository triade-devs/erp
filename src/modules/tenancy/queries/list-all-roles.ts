import "server-only";

import { createClient } from "@/lib/supabase/server";

export type RoleWithCompany = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  companyId: string;
  companyName: string;
  permissionCount: number;
};

export async function listAllRoles(): Promise<RoleWithCompany[]> {
  const supabase = await createClient();

  const [{ data: roles, error: rolesErr }, { data: rpRows, error: rpErr }] = await Promise.all([
    supabase
      .from("roles")
      .select("id, code, name, description, is_system, company_id, companies(name)")
      .order("company_id")
      .order("is_system", { ascending: false })
      .order("name"),
    supabase.from("role_permissions").select("role_id"),
  ]);

  if (rolesErr) throw rolesErr;
  if (rpErr) throw rpErr;

  const countMap = new Map<string, number>();
  for (const rp of rpRows ?? []) {
    countMap.set(rp.role_id, (countMap.get(rp.role_id) ?? 0) + 1);
  }

  return (roles ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    isSystem: r.is_system,
    companyId: r.company_id,
    companyName: (r.companies as { name: string } | null)?.name ?? r.company_id,
    permissionCount: countMap.get(r.id) ?? 0,
  }));
}
