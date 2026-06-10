import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ManageableRole = {
  id: string;
  code: string;
  name: string;
  hierarchyLevel: number;
};

/**
 * Lista as roles que o usuário atual pode atribuir a outros membros,
 * baseado na hierarquia (can_manage_role). Não inclui roles fora da hierarquia
 * gerenciada pelo actor.
 */
export async function listManageableRoles(companyId: string): Promise<ManageableRole[]> {
  const supabase = await createClient();

  // Pega todas roles da empresa, filtra via can_manage_role
  const { data, error } = await supabase
    .from("roles")
    .select("id, code, name, hierarchy_level")
    .eq("company_id", companyId)
    .order("hierarchy_level");

  if (error) throw error;
  if (!data?.length) return [];

  // Filtra cada role via RPC can_manage_role
  // (Em batch — chamada RPC por role pode ser lenta com muitas roles. Aceitável <100 roles/tenant.)
  const checks = await Promise.all(
    data.map(async (r) => {
      const { data: ok } = await supabase.rpc("can_manage_role", {
        p_company: companyId,
        p_target_role: r.id,
      });
      return ok === true ? r : null;
    }),
  );

  return checks
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      hierarchyLevel: r.hierarchy_level,
    }));
}
