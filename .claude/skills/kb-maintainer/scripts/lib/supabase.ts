import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com SERVICE ROLE — só para CI / scripts confiáveis.
 *
 * Cuidados:
 * - Nunca logar a chave (este módulo nem aceita logging dela).
 * - Service role bypassa RLS, então reads/writes daqui devem ser
 *   sempre filtrados manualmente por company_id quando aplicável.
 */
export function getServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para esta skill.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Scrub de mensagens de erro para não vazar a service role em logs. */
export function scrub(message: string): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return message;
  return message.split(key).join("[REDACTED]");
}
