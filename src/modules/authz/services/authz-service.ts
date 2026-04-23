import "server-only";
import { createClient } from "@/lib/supabase/server";

export class ForbiddenError extends Error {
  constructor(public permission: string) {
    super(`forbidden:${permission}`);
    this.name = "ForbiddenError";
  }
}

// Retorna Set de permissões efetivas do usuário logado na empresa (união de todas as roles)
export async function getEffectivePermissions(companyId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data, error } = await supabase
    .from("memberships")
    .select(
      `
      id,
      membership_roles (
        role:roles (
          role_permissions ( permission_code )
        )
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) return new Set();

  type RoleWithPermissions = {
    role_permissions: { permission_code: string }[];
  };

  const perms = new Set<string>();
  for (const mr of data.membership_roles ?? []) {
    const role = mr.role as unknown as RoleWithPermissions | null;
    for (const rp of role?.role_permissions ?? []) {
      perms.add(rp.permission_code);
    }
  }
  return perms;
}

export async function hasPermission(companyId: string, code: string): Promise<boolean> {
  const perms = await getEffectivePermissions(companyId);
  return perms.has(code);
}

export async function requirePermission(companyId: string, code: string): Promise<void> {
  if (!(await hasPermission(companyId, code))) throw new ForbiddenError(code);
}
