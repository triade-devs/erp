import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "../queries/list-audit-logs";

function statusVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "success") return "secondary";
  if (status === "denied" || status === "error") return "destructive";
  return "default";
}

export function AuditLogTable({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum log encontrado.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Data</TableHead>
          <TableHead>Ação</TableHead>
          <TableHead>Recurso</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Ator</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap text-sm">
              {new Date(log.created_at).toLocaleString("pt-BR")}
            </TableCell>
            <TableCell className="font-mono text-sm">{log.action}</TableCell>
            <TableCell className="text-sm">
              {log.resource_type
                ? `${log.resource_type}${log.resource_id ? ` #${log.resource_id}` : ""}`
                : "—"}
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant(log.status)}>{log.status}</Badge>
            </TableCell>
            <TableCell className="text-sm">{log.actor_email ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
