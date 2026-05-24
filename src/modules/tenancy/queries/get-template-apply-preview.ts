import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ApplyPreviewRow = {
  companyId: string;
  companyName: string;
  companySlug: string;
  roleId: string;
  syncedAt: string | null;
  divergent: boolean;
};

export type ApplyPreview = {
  inSync: ApplyPreviewRow[];
  divergent: ApplyPreviewRow[];
};

export async function getTemplateApplyPreview(templateCode: string): Promise<ApplyPreview> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select(
      `
      id,
      template_synced_at,
      company:companies ( id, name, slug )
    `,
    )
    .eq("template_code", templateCode);

  if (error) throw error;

  const rows: ApplyPreviewRow[] = (data ?? []).map((r) => {
    const company = r.company as unknown as { id: string; name: string; slug: string } | null;
    return {
      companyId: company?.id ?? "",
      companyName: company?.name ?? "—",
      companySlug: company?.slug ?? "",
      roleId: r.id,
      syncedAt: r.template_synced_at,
      divergent: r.template_synced_at === null,
    };
  });

  return {
    inSync: rows.filter((r) => !r.divergent),
    divergent: rows.filter((r) => r.divergent),
  };
}
