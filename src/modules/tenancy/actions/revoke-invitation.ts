"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function revokeInvitationAction(invitationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const { data: invitation, error: fetchError } = await supabase
    .from("company_invitations")
    .select("id, company_id, email, status")
    .eq("id", invitationId)
    .single();

  if (fetchError || !invitation) return { ok: false, message: "Convite não encontrado" };
  if (invitation.status !== "pending") return { ok: false, message: "Convite não está pendente" };

  const { error } = await supabase
    .from("company_invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString(), revoked_by: user.id })
    .eq("id", invitationId);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId: invitation.company_id,
    action: "invitation.revoked",
    resourceType: "company_invitation",
    resourceId: invitationId,
    status: "success",
    metadata: { email: invitation.email },
  });

  revalidatePath(`/[companySlug]/settings/members`, "page");
  return { ok: true, message: "Convite revogado" };
}
