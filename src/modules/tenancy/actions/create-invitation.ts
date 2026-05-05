"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { env } from "@/core/config/env";
import { generateToken, generateShortCode, hashTokenHex } from "@/lib/tokens";

const createInvitationSchema = z.object({
  companyId: z.string().uuid(),
  email: z.string().email(),
  roleIds: z.array(z.string().uuid()).default([]),
});

export async function createInvitationAction(
  companyId: string,
  email: string,
  roleIds: string[],
): Promise<ActionResult<{ link: string; shortCode: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  // Permissão: platform admin OU core:invitation:create
  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) {
    try {
      await requirePermission(companyId, "core:invitation:create");
    } catch {
      return { ok: false, message: "Sem permissão para convidar membros" };
    }
  }

  // Valida input
  const parsed = createInvitationSchema.safeParse({
    companyId,
    email: email.toLowerCase().trim(),
    roleIds,
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const normalizedEmail = parsed.data.email;

  // Bloqueia se já existe membership ativa
  const serviceClient = createServiceClient();
  const { data: existingUserId } = await serviceClient.rpc("get_user_id_by_email", {
    p_email: normalizedEmail,
  });
  if (existingUserId) {
    const { data: existingMembership } = await supabase
      .from("memberships")
      .select("id, status")
      .eq("company_id", companyId)
      .eq("user_id", existingUserId as string)
      .eq("status", "active")
      .maybeSingle();

    if (existingMembership) {
      return { ok: false, message: "Usuário já é membro ativo desta empresa" };
    }
  }

  // Gera token + short code
  const plainToken = generateToken();
  const shortCode = generateShortCode("INV");

  // Insere convite (unique index bloqueia duplicatas pendentes)
  const { error: insertError } = await supabase
    .from("company_invitations")
    .insert({
      company_id: companyId,
      email: normalizedEmail,
      token_hash: hashTokenHex(plainToken),
      short_code: shortCode,
      role_ids: roleIds,
      invited_by: user.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

  if (insertError) {
    if (insertError.message.includes("ux_company_invitations_pending_unique")) {
      return { ok: false, message: "Já existe um convite pendente para este email" };
    }
    return { ok: false, message: insertError.message };
  }

  await audit({
    companyId,
    action: "invitation.created",
    resourceType: "company_invitation",
    resourceId: companyId,
    status: "success",
    metadata: { email: normalizedEmail },
  });

  const link = `${env.NEXT_PUBLIC_APP_URL}/accept-invite?t=${plainToken}`;
  revalidatePath(`/[companySlug]/settings/members`, "page");
  return { ok: true, data: { link, shortCode } };
}
