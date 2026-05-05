"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateToken, generateShortCode, hashTokenHex } from "@/lib/tokens";
import { env } from "@/core/config/env";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function approveResetRequestAction(
  requestId: string,
): Promise<ActionResult<{ link: string; shortCode: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Não autenticado" };
  }

  const plainToken = generateToken();
  const shortCode = generateShortCode("RST");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const serviceClient = createServiceClient();
  const { error, data: updated } = await serviceClient
    .from("password_reset_requests")
    .update({
      status: "approved",
      token_hash: hashTokenHex(plainToken),
      short_code: shortCode,
      expires_at: expiresAt,
    })
    .eq("id", requestId)
    .eq("status", "pending_review")
    .select("id");

  if (error) {
    return { ok: false, message: error.message };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, message: "Solicitação não encontrada ou já processada" };
  }

  try {
    await audit({
      companyId: "",
      action: "password.reset_approved",
      resourceType: "password_reset_request",
      resourceId: requestId,
      status: "success",
      metadata: {},
    });
  } catch {
    // Auditoria não deve bloquear o fluxo
  }

  revalidatePath("/", "layout");

  return {
    ok: true,
    data: {
      link: `${env.NEXT_PUBLIC_APP_URL}/recover/reset?t=${plainToken}`,
      shortCode,
    },
  };
}
