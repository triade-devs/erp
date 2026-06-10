import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RoleTemplateSummary = {
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  sortOrder: number;
  permsCount: number;
  instancesCount: number;
  divergentCount: number;
};

export async function listRoleTemplates(): Promise<RoleTemplateSummary[]> {
  const supabase = await createClient();

  const { data: templates, error } = await supabase
    .from("role_templates")
    .select("code, name, description, is_system, sort_order")
    .order("sort_order");

  if (error) throw error;
  if (!templates?.length) return [];

  const codes = templates.map((t) => t.code);

  const [{ data: perms }, { data: roles }] = await Promise.all([
    supabase.from("template_permissions").select("template_code").in("template_code", codes),
    supabase.from("roles").select("template_code, template_synced_at").in("template_code", codes),
  ]);

  const permsCount = new Map<string, number>();
  for (const p of perms ?? []) {
    permsCount.set(p.template_code, (permsCount.get(p.template_code) ?? 0) + 1);
  }

  const instancesCount = new Map<string, number>();
  const divergentCount = new Map<string, number>();
  for (const r of roles ?? []) {
    if (!r.template_code) continue;
    instancesCount.set(r.template_code, (instancesCount.get(r.template_code) ?? 0) + 1);
    if (r.template_synced_at === null) {
      divergentCount.set(r.template_code, (divergentCount.get(r.template_code) ?? 0) + 1);
    }
  }

  return templates.map((t) => ({
    code: t.code,
    name: t.name,
    description: t.description,
    isSystem: t.is_system,
    sortOrder: t.sort_order,
    permsCount: permsCount.get(t.code) ?? 0,
    instancesCount: instancesCount.get(t.code) ?? 0,
    divergentCount: divergentCount.get(t.code) ?? 0,
  }));
}
