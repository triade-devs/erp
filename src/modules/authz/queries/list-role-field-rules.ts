import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FieldMode = "hidden" | "readonly" | "editable";

export type RoleFieldRuleRow = {
  tableName: string;
  columnName: string;
  mode: FieldMode;
};

export type RoleFieldRulesByKey = Record<string, FieldMode>; // key = `${table}.${column}`

export async function listRoleFieldRules(roleId: string): Promise<RoleFieldRulesByKey> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_field_rules")
    .select("table_name, column_name, mode")
    .eq("role_id", roleId);
  if (error) throw error;

  const map: RoleFieldRulesByKey = {};
  for (const row of data ?? []) {
    map[`${row.table_name}.${row.column_name}`] = row.mode as FieldMode;
  }
  return map;
}
