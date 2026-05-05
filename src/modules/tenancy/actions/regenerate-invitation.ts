"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { generateToken, generateShortCode, hashToken } from "@/lib/tokens";
import { audit } from "@/modules/audit";
import { env } from "@/core/config/env";

export async function regenerateInvitationAction(
  invitationId: string,
): Promise<ActionResult<{ link: string; shortCode: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const { data: invitation, error: fetchError } = await supabase
    .from("company_invitations")
    .select("id, company_id, email, role_ids, status")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation) return { ok: false, message: "Convite não encontrado" };
  if (invitation.status !== "pending")
    return { ok: false, message: "Apenas convites pendentes podem ser regenerados" };

  const plainToken = generateToken();
  const shortCode = generateShortCode("INV");
  const tokenHashBuffer = hashToken(plainToken);

  const { error } = await supabase
    .from("company_invitations")
    .update({
      token_hash: Array.from(tokenHashBuffer),
      short_code: shortCode,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", invitationId);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: invitation.company_id,
    action: "invitation.regenerated",
    resourceType: "company_invitation",
    resourceId: invitationId,
    status: "success",
    metadata: { email: invitation.email },
  });

  const link = `${env.NEXT_PUBLIC_APP_URL}/accept-invite?t=${plainToken}`;
  revalidatePath(`/[companySlug]/settings/members`, "page");
  return { ok: true, data: { link, shortCode } };
}
