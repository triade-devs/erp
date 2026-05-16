"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/modules/audit";
import type { ActionResult } from "@/lib/errors";

export async function revokeResetRequestAction(requestId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Não autenticado" };
  }

  const serviceClient = createServiceClient();
  const { error, count } = await serviceClient
    .from("password_reset_requests")
    .update({ status: "revoked" })
    .eq("id", requestId)
    .in("status", ["pending_review", "approved"]);

  if (error) {
    return { ok: false, message: error.message };
  }
  if ((count ?? 0) === 0) {
    return { ok: false, message: "Solicitação não encontrada ou já processada" };
  }

  try {
    await audit({
      companyId: "",
      action: "password.reset_revoked",
      resourceType: "password_reset_request",
      resourceId: requestId,
      status: "success",
      metadata: {},
    });
  } catch {
    // Auditoria não deve bloquear o fluxo
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Solicitação revogada" };
}
