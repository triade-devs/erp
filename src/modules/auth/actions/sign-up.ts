"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { hashTokenHex } from "@/lib/tokens";
import { signUpSchema } from "../schemas";
import { getInvitationByTokenOrCode } from "@/modules/tenancy";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

const SHORT_CODE_RE = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

export async function signUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { inviteToken, fullName, password } = parsed.data;

  const invitation = await getInvitationByTokenOrCode(inviteToken);
  if (!invitation) {
    return { ok: false, message: "Convite inválido, expirado ou já utilizado" };
  }

  const serviceClient = createServiceClient();

  const { data: existingUserId } = await serviceClient.rpc("get_user_id_by_email", {
    p_email: invitation.email,
  });
  if (existingUserId) {
    return {
      ok: false,
      message: "Este email já possui conta. Faça login e acesse o link de convite.",
    };
  }

  const { data: createData, error: createError } = await serviceClient.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError ?? !createData.user) {
    return { ok: false, message: createError?.message ?? "Erro ao criar usuário" };
  }
  const newUser = createData.user;

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invitation.email,
    password,
  });
  if (signInError) {
    return { ok: false, message: signInError.message };
  }

  const isShortCode = SHORT_CODE_RE.test(inviteToken);
  const rpcArgs = isShortCode
    ? {
        // bytea params aparecem como string no tipo gerado; null é válido em runtime
        p_token_hash: null as unknown as string,
        p_short_code: inviteToken.toUpperCase(),
        p_user_id: newUser.id,
      }
    : {
        p_token_hash: hashTokenHex(inviteToken),
        p_short_code: null as unknown as string,
        p_user_id: newUser.id,
      };

  const { data: rpcData, error: rpcError } = await serviceClient.rpc(
    "accept_invitation",
    rpcArgs,
  );
  if (rpcError ?? !rpcData) {
    return { ok: false, message: rpcError?.message ?? "Erro ao aceitar convite" };
  }

  const rpcResult = rpcData as { company_id: string; company_slug: string };

  try {
    await audit({
      companyId: rpcResult.company_id,
      action: "member.signed_up_via_invite",
      resourceType: "membership",
      resourceId: newUser.id,
      status: "success",
      metadata: { email: invitation.email },
    });
  } catch {
    // Auditoria não deve bloquear o fluxo
  }

  redirect(`/${rpcResult.company_slug}`);
}
