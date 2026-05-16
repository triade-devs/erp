import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreateModuleForm } from "@/modules/tenancy";

export default function NewModulePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/platform/modules">← Módulos</Link>
        </Button>
        <h1 className="text-2xl font-bold">Novo módulo</h1>
      </div>
      <CreateModuleForm />
    </div>
  );
}
