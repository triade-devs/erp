"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";

export async function addMemberToCompanyAction(
  companyId: string,
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: isPlatformAdmin } = await supabase.rpc("is_platform_admin");
  if (!isPlatformAdmin) return { ok: false, message: "Acesso negado" };

  const { data: existing } = await supabase
    .from("memberships")
    .select("id, status")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return { ok: false, message: "Usuário já é membro desta empresa" };

  const { data: membership, error } = await supabase
    .from("memberships")
    .insert({
      company_id: companyId,
      user_id: userId,
      status: "active",
      joined_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId,
    action: "member.add",
    resourceType: "membership",
    resourceId: membership.id,
    status: "success",
    metadata: { userId },
  });

  revalidatePath(`/admin/companies/${companyId}/members`);
  return { ok: true, message: "Membro adicionado com sucesso" };
}
