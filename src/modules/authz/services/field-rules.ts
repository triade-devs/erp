import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Util genérico: dado um companyId + table, retorna a lista de colunas
 * que o user atual PODE ver (filtra hidden via visible_columns RPC).
 * Para uso em queries — o caller monta o SELECT com essa lista.
 *
 * Sempre inclui 'id' como fallback (RPC pode retornar lista vazia se o
 * field_catalog não cobrir a tabela ou usuário tem tudo escondido).
 */
export async function listVisibleColumns(
  companyId: string,
  tableName: string,
): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("visible_columns", {
    p_company: companyId,
    p_table: tableName,
  });
  if (error) throw error;
  const cols = (data ?? []) as unknown as string[];
  return cols.length > 0 ? cols : ["id"];
}
