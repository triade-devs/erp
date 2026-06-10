import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FieldMode } from "./list-role-field-rules";

export type UserFieldModes = Record<string, FieldMode>; // key = `${table}.${column}`

/**
 * Bootstrap dos modes do user para a empresa atual.
 * Para cada (table_name, column_name) do field_catalog, resolve user_field_mode.
 * Resultado é injetado no PermissionsProvider para o hook useFieldMode().
 */
export async function getUserFieldModes(companyId: string): Promise<UserFieldModes> {
  const supabase = await createClient();
  const { data: catalog, error: catErr } = await supabase
    .from("field_catalog")
    .select("table_name, column_name");
  if (catErr) throw catErr;
  if (!catalog || catalog.length === 0) return {};

  const result: UserFieldModes = {};
  await Promise.all(
    catalog.map(async (row) => {
      const { data: mode, error } = await supabase.rpc("user_field_mode", {
        p_company: companyId,
        p_table: row.table_name,
        p_column: row.column_name,
      });
      if (error) return;
      result[`${row.table_name}.${row.column_name}`] = (mode ?? "editable") as FieldMode;
    }),
  );
  return result;
}
