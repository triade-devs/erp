import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RoleWithTemplateStatus = {
  id: string;
  code: string;
  name: string;
  isSystem: boolean;
  templateCode: string | null;
  syncedAt: string | null;
  divergent: boolean;
  companyId: string;
  companyName: string;
  companySlug: string;
};

export async function listRolesWithTemplateStatus(): Promise<RoleWithTemplateStatus[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select(
      `
      id, code, name, is_system, template_code, template_synced_at,
      company:companies ( id, name, slug )
    `,
    )
    .order("company(name)")
    .order("code");

  if (error) throw error;

  return (data ?? []).map((r) => {
    const company = r.company as unknown as { id: string; name: string; slug: string } | null;
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      isSystem: r.is_system,
      templateCode: r.template_code,
      syncedAt: r.template_synced_at,
      divergent: r.template_code !== null && r.template_synced_at === null,
      companyId: company?.id ?? "",
      companyName: company?.name ?? "—",
      companySlug: company?.slug ?? "",
    };
  });
}
