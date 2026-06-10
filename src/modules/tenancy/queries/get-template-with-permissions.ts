import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TemplatePermissionRow = {
  code: string;
  resource: string;
  action: string;
  description: string | null;
  granted: boolean;
};

export type TemplateModulePerms = {
  moduleCode: string;
  moduleName: string;
  permissions: TemplatePermissionRow[];
};

export type TemplateDetail = {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
  modules: TemplateModulePerms[];
};

export async function getTemplateWithPermissions(
  templateCode: string,
): Promise<TemplateDetail | null> {
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("role_templates")
    .select("code, name, description, is_system, sort_order")
    .eq("code", templateCode)
    .maybeSingle();

  if (!template) return null;

  const [{ data: granted }, { data: allPerms }] = await Promise.all([
    supabase
      .from("template_permissions")
      .select("permission_code")
      .eq("template_code", templateCode),
    supabase
      .from("permissions")
      .select("code, module_code, resource, action, description, modules(name)")
      .order("module_code")
      .order("resource")
      .order("action"),
  ]);

  const grantedSet = new Set((granted ?? []).map((g) => g.permission_code));

  const moduleMap = new Map<string, { moduleName: string; permissions: TemplatePermissionRow[] }>();

  for (const p of allPerms ?? []) {
    if (!moduleMap.has(p.module_code)) {
      const moduleName = (p.modules as { name: string } | null)?.name ?? p.module_code;
      moduleMap.set(p.module_code, { moduleName, permissions: [] });
    }
    moduleMap.get(p.module_code)!.permissions.push({
      code: p.code,
      resource: p.resource,
      action: p.action,
      description: p.description,
      granted: grantedSet.has(p.code),
    });
  }

  const modules = Array.from(moduleMap.entries()).map(([moduleCode, v]) => ({
    moduleCode,
    moduleName: v.moduleName,
    permissions: v.permissions,
  }));

  return {
    code: template.code,
    name: template.name,
    description: template.description,
    isSystem: template.is_system,
    sortOrder: template.sort_order,
    modules,
  };
}
