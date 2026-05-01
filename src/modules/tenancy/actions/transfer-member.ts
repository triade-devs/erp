"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

/**
 * Transfere (ou copia) um membro de uma empresa para outra.
 * Exclusivo para platform admins.
 */
export async function transferMemberAction(
  membershipId: string,
  sourceCompanyId: string,
  targetCompanyId: string,
  keepInSource: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) return { ok: false, message: rpcError.message };
  if (!isPlatformAdmin) return { ok: false, message: "Acesso negado" };

  const { data: source, error: srcErr } = await supabase
    .from("memberships")
    .select("id, user_id, is_owner, membership_roles(role_id)")
    .eq("id", membershipId)
    .eq("company_id", sourceCompanyId)
    .maybeSingle();

  if (srcErr) return { ok: false, message: srcErr.message };
  if (!source) return { ok: false, message: "Membro não encontrado na empresa de origem" };

  const { data: existing, error: existErr } = await supabase
    .from("memberships")
    .select("id, status")
    .eq("company_id", targetCompanyId)
    .eq("user_id", source.user_id)
    .maybeSingle();

  if (existErr) return { ok: false, message: existErr.message };
  if (existing) return { ok: false, message: "Usuário já é membro da empresa destino" };

  const { data: newMembership, error: insertErr } = await supabase
    .from("memberships")
    .insert({
      company_id: targetCompanyId,
      user_id: source.user_id,
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertErr) return { ok: false, message: insertErr.message };

  if (!keepInSource) {
    const { error: delErr } = await supabase
      .from("memberships")
      .delete()
      .eq("id", membershipId)
      .eq("company_id", sourceCompanyId);

    if (delErr) return { ok: false, message: delErr.message };
  }

  await audit({
    companyId: targetCompanyId,
    action: "member.transfer",
    resourceType: "membership",
    resourceId: newMembership.id,
    status: "success",
    metadata: {
      sourceCompanyId,
      targetCompanyId,
      userId: source.user_id,
      keepInSource,
    },
  });

  revalidatePath(`/admin/companies/${sourceCompanyId}/members`);
  revalidatePath(`/admin/companies/${targetCompanyId}/members`);
  return {
    ok: true,
    message: keepInSource
      ? "Membro copiado para a empresa destino"
      : "Membro transferido com sucesso",
  };
}
