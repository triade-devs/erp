import { listRolesWithTemplateStatus } from "@/modules/tenancy";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Roles por empresa — Plataforma" };

export default async function PlatformRolesPage() {
  const roles = await listRolesWithTemplateStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles por empresa</h1>
          <p className="text-sm text-muted-foreground">
            Visualização read-only. Para editar templates →{" "}
            <Link href="/admin/platform/role-templates" className="underline">
              Templates de Role
            </Link>
            .
          </p>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Template</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last sync</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link href={`/admin/companies/${r.companyId}`} className="underline">
                  {r.companyName}
                </Link>
              </TableCell>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell>
                {r.isSystem ? (
                  <Badge variant="secondary">sistema</Badge>
                ) : (
                  <Badge variant="outline">custom</Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {r.templateCode ?? "—"}
              </TableCell>
              <TableCell>
                {r.templateCode === null ? (
                  <Badge variant="outline">sem template</Badge>
                ) : r.divergent ? (
                  <Badge variant="destructive">divergente</Badge>
                ) : (
                  <Badge variant="default">sincronizado</Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {r.syncedAt ? new Date(r.syncedAt).toLocaleString("pt-BR") : "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
