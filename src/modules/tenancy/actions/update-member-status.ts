"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import type { Enums } from "@/types/database.types";

type MembershipStatus = Enums<"membership_status"> | "removed";

export async function updateMemberStatusAction(
  companyId: string,
  membershipId: string,
  status: MembershipStatus,
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
    .select("id, user_id, is_owner")
    .eq("id", membershipId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (fetchError) return { ok: false, message: fetchError.message };
  if (!membership) return { ok: false, message: "Membro não encontrado" };

  if (membership.is_owner && (status === "suspended" || status === "removed")) {
    return { ok: false, message: "Não é possível suspender ou remover o proprietário da empresa" };
  }

  if (status === "removed") {
    const { error } = await supabase
      .from("memberships")
      .delete()
      .eq("id", membershipId)
      .eq("company_id", companyId);

    if (error) return { ok: false, message: error.message };

    await audit({
      companyId,
      action: "member.remove",
      resourceType: "membership",
      resourceId: membershipId,
      status: "success",
      metadata: { memberUserId: membership.user_id },
    });
  } else {
    const { error } = await supabase
      .from("memberships")
      .update({ status })
      .eq("id", membershipId)
      .eq("company_id", companyId);

    if (error) return { ok: false, message: error.message };

    await audit({
      companyId,
      action: "member.status_update",
      resourceType: "membership",
      resourceId: membershipId,
      status: "success",
      metadata: { memberUserId: membership.user_id, newStatus: status },
    });
  }

  revalidatePath(`/[companySlug]/settings/members`, "page");
  return { ok: true, message: "Status do membro atualizado" };
}
