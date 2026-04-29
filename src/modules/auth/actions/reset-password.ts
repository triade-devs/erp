"use server";

import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "../schemas";
import type { ActionResult } from "@/lib/errors";

export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Senha redefinida com sucesso! Faça login com a nova senha." };
}
