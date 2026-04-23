import Link from "next/link";
import { listModules, CreateCompanyForm } from "@/modules/tenancy";
import { Button } from "@/components/ui/button";

/**
 * Página de criação de nova empresa — /admin/companies/new
 */
export default async function NewCompanyPage() {
  const modules = await listModules();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/companies">← Voltar</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Nova empresa</h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados para criar uma nova empresa na plataforma
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <CreateCompanyForm modules={modules} />
      </div>
    </div>
  );
}
