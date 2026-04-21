import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Retorna o usuário autenticado atual (validado via JWT do servidor).
 * Retorna null se não autenticado.
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Busca perfil complementar
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { ...user, profile };
}
