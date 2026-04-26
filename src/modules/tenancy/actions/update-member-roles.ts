"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";

export async function updateMemberRolesAction(
  companyId: string,
  membershipId: string,
  roleIds: string[],
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  try {
    await requirePermission(companyId, "core:member:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar membros" };
  }

  const { data: membership, error: fetchError } = await supabase
    .from("memberships")
    .select("id, user_id")
    .eq("id", membershipId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError) return { ok: false, message: fetchError.message };
  if (!membership) return { ok: false, message: "Membro não encontrado" };

  if (roleIds.length > 0) {
    const { data: validRoles } = await supabase
      .from("roles")
      .select("id")
      .eq("company_id", companyId)
      .in("id", roleIds);
    if (!validRoles || validRoles.length !== roleIds.length) {
      return { ok: false, message: "Uma ou mais roles são inválidas" };
    }
  }

  // RPC SECURITY DEFINER: evita o deadlock de RLS onde DELETE remove os roles
  // do próprio usuário e o INSERT subsequente falha porque has_permission() = false.
  const { error: rpcError } = await supabase.rpc("set_member_roles", {
    p_company_id: companyId,
    p_membership_id: membershipId,
    p_role_ids: roleIds,
  });

  if (rpcError) return { ok: false, message: rpcError.message };

  await audit({
    companyId,
    action: "member.roles_update",
    resourceType: "membership",
    resourceId: membershipId,
    status: "success",
    metadata: { memberUserId: membership.user_id, roleIds },
  });

  revalidatePath(`/[companySlug]/settings/members`, "page");
  return { ok: true, message: "Roles do membro atualizadas" };
}
