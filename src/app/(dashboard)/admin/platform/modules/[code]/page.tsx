import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getModuleWithPermissions,
  EditModuleForm,
  ModulePermissionsTable,
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
    </div>
  );
}
