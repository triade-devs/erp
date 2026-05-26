import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { listWarehouses } from "@/modules/inventory";
import {
  listCompanyRoles,
  listRolePermissionMatrix,
  listRoleScopes,
  resolveCompany,
  updateRoleAction,
  updateRolePermissionsAction,
} from "@/modules/tenancy";
import { ForbiddenError, requirePermission } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleForm } from "../role-form";
import { PermissionMatrix } from "./permission-matrix";
import { RoleScopesForm } from "./role-scopes-form";

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

  const [allRoles, matrix, roleScopes, warehouses] = await Promise.all([
    listCompanyRoles(company.id),
    listRolePermissionMatrix(company.id, roleId),
    listRoleScopes(roleId),
    listWarehouses(company.id),
  ]);

  const role = allRoles.find((item) => item.id === roleId);
  if (!role) notFound();

  const backHref = `/${companySlug}/settings/roles`;
  const permAction = updateRolePermissionsAction.bind(null, company.id, role.id);
  const availableParents = allRoles.map((item) => ({
    id: item.id,
    name: item.name,
    hierarchyLevel: item.hierarchyLevel,
  }));
  const selectedWarehouseIds = roleScopes
    .filter((scope) => scope.dimensionCode === "warehouse")
    .map((scope) => scope.scopeValue);

  return (
    <section className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>← Roles</Link>
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{role.name}</h2>
          {role.isSystem ? (
            <Badge variant="secondary">Sistema</Badge>
          ) : (
            <Badge variant="outline">Custom</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue={role.isSystem ? "permissions" : "info"}>
        <TabsList>
          {!role.isSystem && <TabsTrigger value="info">Informações</TabsTrigger>}
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
          <TabsTrigger value="scopes">Escopo</TabsTrigger>
        </TabsList>

        {!role.isSystem && (
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
                  parentRoleId: role.parentRoleId ?? null,
                }}
                availableParents={availableParents}
                currentRoleId={role.id}
              />
            </div>
          </TabsContent>
        )}

        <TabsContent value="permissions" className="mt-4">
          {role.isSystem && (
            <p className="mb-4 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              Role de sistema — permissões são gerenciadas automaticamente ao habilitar módulos.
            </p>
          )}
          <PermissionMatrix
            matrix={matrix}
            roleId={role.id}
            companyId={company.id}
            isSystem={role.isSystem}
            action={permAction}
          />
        </TabsContent>

        <TabsContent value="scopes" className="mt-4">
          <RoleScopesForm
            companyId={company.id}
            roleId={role.id}
            warehouses={warehouses}
            selectedWarehouseIds={selectedWarehouseIds}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
