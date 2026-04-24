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

  const { error: deleteError } = await supabase
    .from("membership_roles")
    .delete()
    .eq("membership_id", membershipId);

  if (deleteError) return { ok: false, message: deleteError.message };

  if (roleIds.length > 0) {
    const { error: insertError } = await supabase.from("membership_roles").insert(
      roleIds.map((roleId) => ({
        membership_id: membershipId,
        role_id: roleId,
        assigned_by: user.id,
      })),
    );
    if (insertError) return { ok: false, message: insertError.message };
  }

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
