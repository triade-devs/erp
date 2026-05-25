import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCompany, listCompanyRoles } from "@/modules/tenancy";
import { hasPermission } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteRoleButton } from "./delete-role-button";
import { ResetTemplateButton } from "./reset-template-button";

export const metadata = { title: "Roles — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function SettingsRolesPage({ params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  const [roles, canManage] = await Promise.all([
    listCompanyRoles(company.id),
    hasPermission(company.id, "core:role:manage"),
  ]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Roles</h2>
          <p className="text-sm text-muted-foreground">
            {roles.length} {roles.length === 1 ? "role" : "roles"} configuradas
          </p>
        </div>
        {canManage && (
          <Button asChild size="sm">
            <Link href={`/${companySlug}/settings/roles/new`}>+ Nova role</Link>
          </Button>
        )}
      </div>

      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma role cadastrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-[260px]">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {role.code}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {role.description ?? "—"}
                </TableCell>
                <TableCell>
                  {role.isSystem ? (
                    <Badge variant="secondary">Sistema</Badge>
                  ) : (
                    <Badge variant="outline">Custom</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {role.templateCode === null ? (
                    <Badge variant="outline">sem template</Badge>
                  ) : role.divergent ? (
                    <Badge variant="destructive">Personalizada</Badge>
                  ) : (
                    <Badge>Sincronizada</Badge>
                  )}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1">
                      {!role.isSystem && (
                        <>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/${companySlug}/settings/roles/${role.id}`}>Editar</Link>
                          </Button>
                          <DeleteRoleButton
                            companyId={company.id}
                            roleId={role.id}
                            roleName={role.name}
                          />
                        </>
                      )}
                      {role.templateCode !== null && role.divergent && (
                        <ResetTemplateButton
                          companyId={company.id}
                          roleId={role.id}
                          roleName={role.name}
                        />
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
