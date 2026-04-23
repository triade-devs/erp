"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/errors";
import { switchActiveCompanySchema } from "../schemas";
import { ACTIVE_COMPANY_COOKIE } from "../constants";

/**
 * Server Action para trocar a empresa ativa do usuário.
 *
 * Valida que o usuário possui membership ativo na empresa solicitada
 * e define o cookie `erp.active_company` com o UUID da empresa.
 */
export async function switchActiveCompanyAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = switchActiveCompanySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { companyId } = parsed.data;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, message: "Não autenticado" };

  // Verifica se o usuário possui membership ativo na empresa solicitada
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };

  if (!membership) {
    return { ok: false, message: "Você não possui acesso a esta empresa" };
  }

  // Define o cookie de empresa ativa
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });

  revalidatePath("/");
  return { ok: true, message: "Empresa ativa atualizada" };
}
