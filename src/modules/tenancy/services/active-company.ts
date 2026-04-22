import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_COMPANY_COOKIE = "erp.active_company";

/**
 * Retorna o ID da empresa ativa para o usuário atual.
 *
 * Lê o cookie `erp.active_company` e valida que o usuário ainda possui
 * membership ativo nessa empresa. Caso o cookie seja inválido ou ausente,
 * faz fallback para a primeira empresa com membership ativo do usuário.
 *
 * @returns O ID (UUID) da empresa ativa, ou null se o usuário não estiver
 *          autenticado ou não possuir nenhum membership ativo.
 */
export async function getActiveCompanyId(): Promise<string | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Busca todos os memberships ativos do usuário
  const { data: memberships, error } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error || !memberships || memberships.length === 0) return null;

  const validCompanyIds = new Set(memberships.map((m) => m.company_id));

  // Tenta usar o cookie de empresa ativa
  const cookieStore = await cookies();
  const storedCompanyId = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value;

  if (storedCompanyId && validCompanyIds.has(storedCompanyId)) {
    return storedCompanyId;
  }

  // Fallback: retorna a primeira empresa com membership ativo
  return memberships[0]?.company_id ?? null;
}
