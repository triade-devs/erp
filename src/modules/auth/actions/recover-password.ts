"use server";

import { createClient } from "@/lib/supabase/server";
import { recoverSchema } from "../schemas";
import { env } from "@/core/config/env";
import type { ActionResult } from "@/lib/errors";

export async function recoverPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = recoverSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/recover/reset`,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    message: "Se o email estiver cadastrado, enviaremos um link de recuperação.",
  };
}
