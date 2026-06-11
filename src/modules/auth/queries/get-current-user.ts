import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type CompanyMembership = {
  id: string;
  companyId: string;
  companySlug: string;
  companyName: string;
  status: Tables<"memberships">["status"];
  isAdmin: boolean;
  roles: string[]; // códigos dos roles, ex: ['admin', 'estoque-gestao']
};

/**
 * Retorna o usuário autenticado atual (validado via JWT do servidor),
 * seu perfil complementar e suas memberships ativas.
 * Retorna null se não autenticado.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Busca perfil complementar do usuário
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // Busca memberships com empresa e roles
  const { data: rawMemberships } = await supabase
    .from("memberships")
    .select(
      `
      id,
      company_id,
      status,
      company:companies ( slug, name ),
      membership_roles (
        role:roles ( code )
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("status", "active");

  const memberships: CompanyMembership[] = (rawMemberships ?? []).map((m) => {
    const company = (m as unknown as { company: { slug: string; name: string } | null }).company;
    const membershipRoles = (
      m as unknown as {
        membership_roles: Array<{ role: { code: string } | null }>;
      }
    ).membership_roles;

    const roleCodes = (membershipRoles ?? []).map((mr) => mr.role?.code ?? "").filter(Boolean);

    return {
      id: m.id,
      companyId: m.company_id,
      companySlug: company?.slug ?? "",
      companyName: company?.name ?? "",
      status: m.status,
      isAdmin: roleCodes.includes("admin"),
      roles: roleCodes,
    };
  });

  return { ...user, profile, memberships };
}
