import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PermissionRow = {
  code: string;
  resource: string;
  action: string;
  description: string | null;
  granted: boolean;
};

export type ModulePermissions = {
  moduleCode: string;
  moduleName: string;
  permissions: PermissionRow[];
};

export async function listRolePermissionMatrix(
  companyId: string,
  roleId: string,
): Promise<ModulePermissions[]> {
  const supabase = await createClient();

  const [{ data: enabledModules, error: modErr }, { data: grantedPerms, error: grantErr }] =
    await Promise.all([
      supabase
        .from("company_modules")
        .select("module_code, modules(name)")
        .eq("company_id", companyId),
      supabase.from("role_permissions").select("permission_code").eq("role_id", roleId),
    ]);

  if (modErr) throw modErr;
  if (grantErr) throw grantErr;

  if (!enabledModules || enabledModules.length === 0) return [];

  const moduleCodes = enabledModules.map((m) => m.module_code);
  const grantedSet = new Set((grantedPerms ?? []).map((p) => p.permission_code));

  const { data: allPerms, error: permErr } = await supabase
    .from("permissions")
    .select("code, module_code, resource, action, description")
    .in("module_code", moduleCodes)
    .order("module_code")
    .order("resource")
    .order("action");

  if (permErr) throw permErr;

  const moduleMap = new Map<string, { moduleName: string; permissions: PermissionRow[] }>();

  for (const em of enabledModules) {
    const name = (em.modules as { name: string } | null)?.name ?? em.module_code;
    moduleMap.set(em.module_code, { moduleName: name, permissions: [] });
  }

  for (const perm of allPerms ?? []) {
    const entry = moduleMap.get(perm.module_code);
    if (!entry) continue;
    entry.permissions.push({
      code: perm.code,
      resource: perm.resource,
      action: perm.action,
      description: perm.description,
      granted: grantedSet.has(perm.code),
    });
  }

  return Array.from(moduleMap.entries())
    .filter(([, v]) => v.permissions.length > 0)
    .map(([moduleCode, { moduleName, permissions }]) => ({ moduleCode, moduleName, permissions }));
}
