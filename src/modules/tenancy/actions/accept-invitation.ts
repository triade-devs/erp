"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { type ActionResult } from "@/lib/errors";
import { audit } from "@/modules/audit";
import { hashTokenHex } from "@/lib/tokens";

export async function acceptInvitationAction(
  tokenOrShortCode: string,
  _password?: string,
  _fullName?: string,
): Promise<ActionResult<{ companySlug: string }>> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();

  // Determina se é token longo (base64url ~43 chars) ou short code (INV-XXXX-XXXX)
  const isShortCode = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(tokenOrShortCode);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rpcResult: {
    data: { company_slug: string; company_id: string } | null;
    error: { message: string } | null;
  };

  if (isShortCode) {
    // Rate limit check
    const { data: allowed } = await serviceClient.rpc("record_short_code_attempt", {
      p_ip: "server",
      p_identifier: `inv:${tokenOrShortCode.toUpperCase()}`,
    });
    if (!allowed) {
      return {
        ok: false,
        message: "Muitas tentativas incorretas. Aguarde antes de tentar novamente.",
      };
    }
    rpcResult = (await serviceClient.rpc("accept_invitation", {
      // bytea params aparecem como string no tipo gerado; null é válido em runtime
      p_token_hash: null as unknown as string,
      p_short_code: tokenOrShortCode.toUpperCase(),
      p_user_id: user?.id ?? "",
    })) as typeof rpcResult;
  } else {
    rpcResult = (await serviceClient.rpc("accept_invitation", {
      p_token_hash: hashTokenHex(tokenOrShortCode),
      p_short_code: null as unknown as string,
      p_user_id: user?.id ?? "",
    })) as typeof rpcResult;
  }

  if (rpcResult.error) {
    if (rpcResult.error.message?.includes("invitation_not_found")) {
      return { ok: false, message: "Convite inválido, expirado ou já utilizado" };
    }
    return { ok: false, message: rpcResult.error.message };
  }

  const companySlug = rpcResult.data?.company_slug ?? "";

  await audit({
    companyId: rpcResult.data?.company_id ?? "",
    action: "invitation.accepted",
    resourceType: "company_invitation",
    resourceId: companySlug,
    status: "success",
    metadata: {},
  });

  redirect(`/${companySlug}`);
}
