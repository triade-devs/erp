import "server-only";

import { createClient } from "@/lib/supabase/server";
import { hashToken } from "@/lib/tokens";

export type InvitationLookup = {
  id: string;
  companyId: string;
  email: string;
  status: string;
  expiresAt: string;
};

export async function getInvitationByTokenOrCode(
  input: string,
): Promise<InvitationLookup | null> {
  const supabase = await createClient();
  const isShortCode = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(input);

  let query = supabase
    .from("company_invitations")
    .select("id, company_id, email, status, expires_at")
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString());

  if (isShortCode) {
    query = query.eq("short_code", input.toUpperCase());
  } else {
    const tokenHash = hashToken(input);
    query = query.eq("token_hash", Array.from(tokenHash));
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
