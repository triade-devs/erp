import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdateCompanyForm } from "@/modules/tenancy";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CompanyOverviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: company, error },
    { count: membersCount },
    { count: modulesCount },
    { count: logsCount },
  ] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).maybeSingle(),
    supabase.from("memberships").select("*", { count: "exact", head: true }).eq("company_id", id),
    supabase
      .from("company_modules")
      .select("*", { count: "exact", head: true })
      .eq("company_id", id),
    supabase.from("audit_logs").select("*", { count: "exact", head: true }).eq("company_id", id),
  ]);

  if (error || !company) notFound();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Membros</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold">{membersCount ?? 0}</span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/companies/${id}/members`}>Ver</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Módulos ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-2xl font-bold">{modulesCount ?? 0}</span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/companies/${id}/modules`}>Gerenciar</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eventos auditados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{logsCount ?? 0}</span>
          </CardContent>
        </Card>
      </div>

      <div className="max-w-2xl">
        <h2 className="mb-4 text-lg font-semibold">Dados da empresa</h2>
        <UpdateCompanyForm company={company} />
      </div>
    </div>
  );
}
