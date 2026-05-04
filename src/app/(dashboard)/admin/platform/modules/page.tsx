import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listModulesWithStats, AdminModulesTable } from "@/modules/tenancy";

export default async function PlatformModulesPage() {
  const modules = await listModulesWithStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Módulos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo global de módulos da plataforma ({modules.length})
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/platform/modules/new">Novo módulo</Link>
        </Button>
      </div>

      {modules.length === 0 ? (
        <p className="text-muted-foreground">Nenhum módulo cadastrado.</p>
      ) : (
        <AdminModulesTable modules={modules} />
      )}
    </div>
  );
}
