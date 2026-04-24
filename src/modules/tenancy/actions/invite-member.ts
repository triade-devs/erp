"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAnonClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { env } from "@/core/config/env";

export async function inviteMemberAction(
  companyId: string,
  email: string,
  roleIds: string[],
): Promise<ActionResult> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, message: "Service role não configurado" };
  }

  const supabase = await createAnonClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  try {
    await requirePermission(companyId, "core:member:invite");
  } catch {
    return { ok: false, message: "Sem permissão para convidar membros" };
  }

  const adminClient = createServiceClient();

  const { data: invitedUser, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${env.NEXT_PUBLIC_APP_URL}/accept-invite` },
  );

  if (inviteError) return { ok: false, message: inviteError.message };

  const invitedUserId = invitedUser.user.id;

  const { data: existingMembership } = await supabase
    .from("memberships")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("user_id", invitedUserId)
    .maybeSingle();

  if (existingMembership) {
    if (existingMembership.status !== "invited") {
      return { ok: false, message: "Usuário já é membro desta empresa" };
    }
    return { ok: false, message: "Usuário já possui convite pendente" };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .insert({
      company_id: companyId,
      user_id: invitedUserId,
      status: "invited",
      invited_by: user.id,
      invited_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (membershipError) return { ok: false, message: membershipError.message };

  if (roleIds.length > 0) {
    const { error: rolesError } = await supabase.from("membership_roles").insert(
      roleIds.map((roleId) => ({
        membership_id: membership.id,
        role_id: roleId,
        assigned_by: user.id,
      })),
    );
    if (rolesError) return { ok: false, message: rolesError.message };
  }

  await audit({
    companyId,
    action: "member.invite",
    resourceType: "membership",
    resourceId: membership.id,
    status: "success",
    metadata: { email, roleIds },
  });

  revalidatePath(`/[companySlug]/settings/members`, "page");
  return { ok: true, message: `Convite enviado para ${email}` };
}
