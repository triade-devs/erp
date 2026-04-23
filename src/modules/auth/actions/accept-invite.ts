"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function acceptInviteAction(companyId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Não autenticado" };

  // Verifica que existe membership em estado 'invited'
  const { data: membership, error: fetchError } = await supabase
    .from("memberships")
    .select("id, company_id, companies(slug)")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .eq("status", "invited")
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!membership) {
    return { ok: false, message: "Convite não encontrado ou já aceito" };
  }

  // Ativa o membership
  const { error: updateError } = await supabase
    .from("memberships")
    .update({ status: "active", joined_at: new Date().toISOString() })
    .eq("id", membership.id);

  if (updateError) return { ok: false, message: updateError.message };

  await audit({
    companyId,
    action: "member.accept_invite",
    resourceType: "membership",
    resourceId: membership.id,
    status: "success",
    metadata: { userId: user.id },
  });

  const companyData = membership.companies as { slug: string } | null;
  const slug = companyData?.slug ?? companyId;
  redirect(`/${slug}`);
}
