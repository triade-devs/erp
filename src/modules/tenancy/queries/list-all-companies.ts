import "server-only";

import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import type { Tables } from "@/types/database.types";

export type Company = Tables<"companies">;

/**
 * Retorna todas as empresas da plataforma (somente para administradores de plataforma).
 *
 * @throws {AppError} Se o usuário não for administrador da plataforma
 */
export async function listAllCompanies(): Promise<Company[]> {
  const supabase = await createClient();

  // Verifica se o usuário é administrador da plataforma
  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");

  if (rpcError) throw rpcError;

  if (!isPlatformAdmin) {
    throw new AppError("Acesso negado", "ACCESS_DENIED");
  }

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;

  return data ?? [];
}
