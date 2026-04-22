import "server-only";

import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import type { Tables } from "@/types/database.types";

export type Company = Tables<"companies">;

/**
 * Resolve uma empresa pelo slug. Verifica se o usuário atual possui
 * membership ativo na empresa ou se é um administrador da plataforma.
 *
 * @throws {AppError} Se a empresa não for encontrada
 * @throws {AppError} Se o usuário não tiver membership ativo na empresa
 */
export async function resolveCompany(slug: string): Promise<Company> {
  const supabase = await createClient();

  // Busca a empresa pelo slug
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("*")
    .eq("slug", slug)
    .single();

  if (companyError || !company) {
    throw new AppError("Empresa não encontrada", "COMPANY_NOT_FOUND");
  }

  // Verifica se é platform admin (admins da plataforma podem acessar qualquer empresa)
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");

  if (isPlatformAdmin) {
    return company;
  }

  // Verifica se o usuário tem membership ativo na empresa
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError("Não autenticado", "UNAUTHENTICATED");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", company.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) throw membershipError;

  if (!membership) {
    throw new AppError("Acesso negado a esta empresa", "ACCESS_DENIED");
  }

  return company;
}
