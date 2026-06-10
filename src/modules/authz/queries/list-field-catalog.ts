import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FieldCatalogEntry = {
  tableName: string;
  columnName: string;
  label: string;
  description: string | null;
  moduleCode: string | null;
};

export type FieldCatalogByModule = Record<string, FieldCatalogEntry[]>;

export async function listFieldCatalog(): Promise<FieldCatalogByModule> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("field_catalog")
    .select("table_name, column_name, label, description, module_code")
    .order("module_code")
    .order("table_name")
    .order("column_name");
  if (error) throw error;

  const grouped: FieldCatalogByModule = {};
  for (const row of data ?? []) {
    const key = row.module_code ?? "_unscoped";
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push({
      tableName: row.table_name,
      columnName: row.column_name,
      label: row.label,
      description: row.description,
      moduleCode: row.module_code,
    });
  }
  return grouped;
}
