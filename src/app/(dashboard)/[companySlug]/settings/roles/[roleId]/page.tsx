import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  resolveCompany,
  updateRoleAction,
  listRolePermissionMatrix,
  updateRolePermissionsAction,
} from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleForm } from "../role-form";
import { PermissionMatrix } from "./permission-matrix";

export const metadata = { title: "Editar Role — ERP" };

type Props = {
  params: Promise<{ companySlug: string; roleId: string }>;
};

export default async function EditRolePage({ params }: Props) {
  const { companySlug, roleId } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "core:role:manage");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect(`/${companySlug}/settings/roles`);
    throw e;
  }

  const supabase = await createClient();
  const { data: role, error } = await supabase
    .from("roles")
    .select("id, code, name, description, is_system")
    .eq("id", roleId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (error) throw error;
  if (!role) notFound();

  const backHref = `/${companySlug}/settings/roles`;
  const matrix = await listRolePermissionMatrix(company.id, role.id);
  const permAction = updateRolePermissionsAction.bind(null, company.id, role.id);

  return (
    <section className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>← Roles</Link>
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{role.name}</h2>
          {role.is_system ? (
            <Badge variant="secondary">Sistema</Badge>
          ) : (
            <Badge variant="outline">Custom</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue={role.is_system ? "permissions" : "info"}>
        <TabsList>
          {!role.is_system && <TabsTrigger value="info">Informações</TabsTrigger>}
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
        </TabsList>

        {!role.is_system && (
          <TabsContent value="info" className="mt-4">
            <div className="space-y-4 rounded-md border p-4">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Código
                </p>
                <p className="font-mono text-sm">{role.code}</p>
              </div>
              <RoleForm
                action={updateRoleAction.bind(null, company.id, role.id)}
                backHref={backHref}
                submitLabel="Salvar alterações"
                defaultValues={{
                  name: role.name,
                  description: role.description ?? undefined,
                }}
              />
            </div>
          </TabsContent>
        )}

        <TabsContent value="permissions" className="mt-4">
          {role.is_system && (
            <p className="mb-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Role de sistema — permissões são gerenciadas automaticamente ao habilitar módulos.
            </p>
          )}
          <PermissionMatrix
            matrix={matrix}
            roleId={role.id}
            companyId={company.id}
            isSystem={role.is_system}
            action={permAction}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
