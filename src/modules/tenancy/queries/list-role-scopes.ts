import "server-only";

import { createClient } from "@/lib/supabase/server";

export type RoleScope = {
  dimensionCode: string;
  scopeValue: string;
};

export async function listRoleScopes(roleId: string): Promise<RoleScope[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_scopes")
    .select("dimension_code, scope_value")
    .eq("role_id", roleId)
    .order("dimension_code")
    .order("scope_value");

  if (error) throw error;
  return (data ?? []).map((rs) => ({
    dimensionCode: rs.dimension_code,
    scopeValue: rs.scope_value,
  }));
}
