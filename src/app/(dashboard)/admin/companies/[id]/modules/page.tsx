import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCompanyModules, ModuleToggleList } from "@/modules/tenancy";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CompanyModulesPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!company) notFound();

  const modules = await listCompanyModules(id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Módulos</h2>
        <p className="text-sm text-muted-foreground">
          Habilite ou desabilite módulos para esta empresa. Alterações refletem imediatamente nas
          permissões das roles-sistema.
        </p>
      </div>
      <ModuleToggleList companyId={id} modules={modules} />
    </div>
  );
}
