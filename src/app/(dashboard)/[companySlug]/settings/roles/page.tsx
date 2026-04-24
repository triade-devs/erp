import { notFound } from "next/navigation";
import { resolveCompany, listCompanyRoles } from "@/modules/tenancy";
import { AppError } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

  const roles = await listCompanyRoles(company.id);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Roles</h2>
        <p className="text-sm text-muted-foreground">
          {roles.length} {roles.length === 1 ? "role" : "roles"} configuradas
        </p>
      </div>

      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma role cadastrada.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {role.code}
                </TableCell>
                <TableCell>
                  {role.isSystem ? (
                    <Badge variant="secondary">sistema</Badge>
                  ) : (
                    <Badge variant="outline">personalizada</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
