"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { recoverSchema } from "../schemas";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

const GENERIC_MESSAGE =
  "Se o email estiver cadastrado, sua solicitação foi recebida. Aguarde contato do administrador.";

// RPC não tipado ainda — cast necessário
// deno-lint-ignore no-explicit-any
type AnyClient = any;

export async function recoverPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = recoverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const serviceClient: AnyClient = createServiceClient();

  try {
    await serviceClient.rpc("request_password_reset", { p_email: parsed.data.email });
  } catch {
    // Erro ignorado — resposta genérica por anti-enumeração
  }

  try {
    await audit({
      companyId: "",
      action: "password.reset_requested",
      resourceType: "password_reset_request",
      resourceId: parsed.data.email,
      status: "success",
      metadata: { email: parsed.data.email },
    });
  } catch {
    // Auditoria não deve bloquear o fluxo
  }

  return { ok: true, message: GENERIC_MESSAGE };
}
