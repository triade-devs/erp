"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateToken, generateShortCode, hashToken } from "@/lib/tokens";
import { env } from "@/core/config/env";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function initiateResetForUserAction(
  userId: string,
): Promise<ActionResult<{ link: string; shortCode: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Não autenticado" };
  }

  const serviceClient = createServiceClient();
  // Tabela não tipada ainda — cast necessário
  // deno-lint-ignore no-explicit-any
  const sc = serviceClient as any;

  const { data: targetUser, error: getUserError } =
    await serviceClient.auth.admin.getUserById(userId);
  if (getUserError ?? !targetUser.user) {
    return { ok: false, message: "Usuário não encontrado" };
  }

  const plainToken = generateToken();
  const shortCode = generateShortCode("RST");
  const hash = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { error: insertError } = await sc.from("password_reset_requests").insert({
    user_id: userId,
    email: targetUser.user.email ?? "",
    source: "owner_initiated",
    status: "approved",
    token_hash: Array.from(hash),
    short_code: shortCode,
    expires_at: expiresAt,
  });

  if (insertError) {
    return { ok: false, message: insertError.message };
  }

  try {
    await audit({
      companyId: "",
      action: "password.reset_approved",
      resourceType: "password_reset_request",
      resourceId: userId,
      status: "success",
      metadata: { source: "owner_initiated" },
    });
  } catch {
    // Auditoria não deve bloquear o fluxo
  }

  return {
    ok: true,
    data: {
      link: `${env.NEXT_PUBLIC_APP_URL}/recover/reset?t=${plainToken}`,
      shortCode,
    },
  };
}
