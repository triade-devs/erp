"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/errors";
import { switchActiveCompanySchema } from "../schemas";
import { ACTIVE_COMPANY_COOKIE, ACTIVE_COMPANY_SLUG_COOKIE } from "../constants";

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
  // e busca o slug da empresa para definir o cookie de navegação
  const { data: membership, error } = await supabase
    .from("memberships")
    .select("id, companies(slug)")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) return { ok: false, message: error.message };

  if (!membership) {
    return { ok: false, message: "Você não possui acesso a esta empresa" };
  }

  const companySlug = (membership.companies as { slug: string } | null)?.slug;

  // Define os cookies de empresa ativa (ID e slug)
  const cookieStore = await cookies();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };

  cookieStore.set(ACTIVE_COMPANY_COOKIE, companyId, cookieOptions);

  if (companySlug) {
    cookieStore.set(ACTIVE_COMPANY_SLUG_COOKIE, companySlug, cookieOptions);
  }

  revalidatePath("/");
  return { ok: true, message: "Empresa ativa atualizada" };
}
