import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { hashTokenHex } from "@/lib/tokens";

export type InvitationLookup = {
  id: string;
  companyId: string;
  email: string;
  status: string;
  expiresAt: string;
};

export async function getInvitationByTokenOrCode(input: string): Promise<InvitationLookup | null> {
  // Usa service client: o token/código em si é a autorização (pré-lookup para UX).
  // A RLS de company_invitations requer autenticação, mas visitantes não autenticados
  // precisam ver os dados do convite antes de criar conta.
  const supabase = createServiceClient();
  const isShortCode = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(input);

  let query = supabase
    .from("company_invitations")
    .select("id, company_id, email, status, expires_at")
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  if (isShortCode) {
    query = query.eq("short_code", input.toUpperCase());
  } else {
    query = query.eq("token_hash", hashTokenHex(input));
  }

  const { data, error } = await query.maybeSingle();
  if (error ?? !data) return null;

  return {
    id: data.id,
    companyId: data.company_id,
    email: data.email,
    status: data.status,
    expiresAt: data.expires_at,
  };
}
