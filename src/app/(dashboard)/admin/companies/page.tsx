import Link from "next/link";
import { listAllCompanies } from "@/modules/tenancy";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Página de listagem de empresas — /admin/companies
 * Acessível apenas para administradores de plataforma (gated pelo AdminLayout).
 */
export default async function AdminCompaniesPage() {
  const companies = await listAllCompanies();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-sm text-muted-foreground">Gerencie todas as empresas da plataforma</p>
        </div>
        <Button asChild>
          <Link href="/admin/companies/new">Nova empresa</Link>
        </Button>
      </div>

      {companies.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {company.slug}
                </TableCell>
                <TableCell className="capitalize">{company.plan}</TableCell>
                <TableCell>
                  {company.is_active ? (
                    <Badge variant="default">Ativa</Badge>
                  ) : (
                    <Badge variant="secondary">Inativa</Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(company.created_at).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/companies/${company.id}`}>Editar</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
