import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getModuleWithPermissions,
  EditModuleForm,
  ModulePermissionsTable,
  DeleteModuleButton,
} from "@/modules/tenancy";

type Props = { params: Promise<{ code: string }> };

export default async function EditModulePage({ params }: Props) {
  const { code } = await params;
  const mod = await getModuleWithPermissions(code);

  if (!mod) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/platform/modules">← Módulos</Link>
        </Button>
        <h1 className="text-2xl font-bold">Editar módulo: {mod.name}</h1>
      </div>

      <EditModuleForm module={mod} />

      <ModulePermissionsTable moduleCode={mod.code} permissions={mod.permissions} />

      {!mod.is_system && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <h2 className="mb-1 text-sm font-semibold text-destructive">Zona de perigo</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Excluir o módulo remove permanentemente todas as permissões e vínculos com empresas.
          </p>
          <DeleteModuleButton moduleCode={mod.code} moduleName={mod.name} />
        </div>
      )}
    </div>
  );
}
