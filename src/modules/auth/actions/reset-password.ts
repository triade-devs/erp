"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";
import { hashTokenHex } from "@/lib/tokens";
import { resetPasswordSchema } from "../schemas";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

const SHORT_CODE_RE = /^[A-Z0-9]{3}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

// RPC não tipado ainda — cast necessário
// deno-lint-ignore no-explicit-any
type AnyClient = any;

export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { tokenOrShortCode, password } = parsed.data;
  const isShortCode = SHORT_CODE_RE.test(tokenOrShortCode);
  const serviceClient: AnyClient = createServiceClient();

  if (isShortCode) {
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? "unknown";
    const { data: allowed } = await serviceClient.rpc("record_short_code_attempt", {
      p_ip: ip,
      p_identifier: tokenOrShortCode.toUpperCase(),
    });
    if (!allowed) {
      return { ok: false, message: "Muitas tentativas. Aguarde antes de tentar novamente." };
    }
  }

  const rpcArgs = isShortCode
    ? { p_token_hash: null as unknown as string, p_short_code: tokenOrShortCode.toUpperCase() }
    : { p_token_hash: hashTokenHex(tokenOrShortCode), p_short_code: null as unknown as string };

  const { data: userId, error: rpcError } = await serviceClient.rpc(
    "consume_password_reset",
    rpcArgs,
  );
  if (rpcError ?? !userId) {
    return { ok: false, message: "Token inválido, expirado ou já utilizado" };
  }

  const { error: updateError } = await serviceClient.auth.admin.updateUser(userId as string, {
    password,
  });
  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  try {
    await serviceClient.auth.admin.signOut(userId as string, "global");
  } catch {
    // Ignorado — sessões antigas podem já ter expirado
  }

  try {
    await audit({
      companyId: "",
      action: "password.reset_consumed",
      resourceType: "password_reset_request",
      resourceId: userId as string,
      status: "success",
      metadata: {},
    });
  } catch {
    // Auditoria não deve bloquear o fluxo
  }

  redirect("/login");
}
