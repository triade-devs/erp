import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type CompanyMembership = {
  id: string;
  companyId: string;
  companySlug: string;
  companyName: string;
  status: Tables<"memberships">["status"];
  isOwner: boolean;
  roles: string[]; // códigos dos roles, ex: ['owner', 'manager']
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

  // Busca perfil complementar (mantém profiles.role intocado para rollback)
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // Busca memberships com empresa e roles
  const { data: rawMemberships } = await supabase
    .from("memberships")
    .select(
      `
      id,
      company_id,
      status,
      is_owner,
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

    return {
      id: m.id,
      companyId: m.company_id,
      companySlug: company?.slug ?? "",
      companyName: company?.name ?? "",
      status: m.status,
      isOwner: m.is_owner,
      roles: (membershipRoles ?? []).map((mr) => mr.role?.code ?? "").filter(Boolean),
    };
  });

  return { ...user, profile, memberships };
}
