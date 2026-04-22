import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { UpdateCompanyForm } from "@/modules/tenancy";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * Página de edição de empresa — /admin/companies/[id]
 */
export default async function EditCompanyPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !company) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/companies">← Voltar</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Editar empresa</h1>
          <p className="font-mono text-sm text-muted-foreground">{company.slug}</p>
        </div>
      </div>

      <div className="max-w-2xl">
        <UpdateCompanyForm company={company} />
      </div>
    </div>
  );
}
