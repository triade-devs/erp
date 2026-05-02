import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SystemRolePermission = {
  code: string;
  moduleCode: string;
  resource: string;
  action: string;
  description: string | null;
  granted: boolean;
  inconsistent: boolean;
};

export type SystemRoleMatrix = {
  moduleCode: string;
  moduleName: string;
  permissions: SystemRolePermission[];
};

export async function getSystemRolePermissions(roleCode: string): Promise<SystemRoleMatrix[]> {
  const supabase = await createClient();

  const { data: roles, error: rolesErr } = await supabase
    .from("roles")
    .select("id")
    .eq("code", roleCode)
    .eq("is_system", true);

  if (rolesErr) throw rolesErr;
  if (!roles || roles.length === 0) return [];

  const roleIds = roles.map((r) => r.id);
  const totalRoles = roleIds.length;

  const [{ data: granted, error: grantErr }, { data: allPerms, error: permErr }] =
    await Promise.all([
      supabase.from("role_permissions").select("role_id, permission_code").in("role_id", roleIds),
      supabase
        .from("permissions")
        .select("code, module_code, resource, action, description, modules(name)")
        .order("module_code")
        .order("resource")
        .order("action"),
    ]);

  if (grantErr) throw grantErr;
  if (permErr) throw permErr;

  const grantCountMap = new Map<string, number>();
  for (const rp of granted ?? []) {
    grantCountMap.set(rp.permission_code, (grantCountMap.get(rp.permission_code) ?? 0) + 1);
  }

  const moduleMap = new Map<string, { moduleName: string; permissions: SystemRolePermission[] }>();

  for (const p of allPerms ?? []) {
    if (!moduleMap.has(p.module_code)) {
      const moduleName = (p.modules as { name: string } | null)?.name ?? p.module_code;
      moduleMap.set(p.module_code, { moduleName, permissions: [] });
    }
    const count = grantCountMap.get(p.code) ?? 0;
    moduleMap.get(p.module_code)!.permissions.push({
      code: p.code,
      moduleCode: p.module_code,
      resource: p.resource,
      action: p.action,
      description: p.description,
      granted: count > 0,
      inconsistent: count > 0 && count < totalRoles,
    });
  }

  return Array.from(moduleMap.entries()).map(([moduleCode, { moduleName, permissions }]) => ({
    moduleCode,
    moduleName,
    permissions,
  }));
}
