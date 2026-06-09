import Link from "next/link";
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
import { formatCurrency } from "@/lib/utils";
import type { Space } from "../types";

const MODE_LABEL: Record<Space["booking_mode"], string> = {
  daily: "Por dia",
  hourly: "Por horário",
  both: "Dia ou horário",
};

type Props = {
  spaces: Space[];
  basePath: string;
  searchQuery?: string;
  createHref?: string;
  canManage?: boolean;
};

export function SpaceTable({ spaces, basePath, searchQuery, createHref, canManage }: Props) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {searchQuery
            ? `Nenhum espaço encontrado para "${searchQuery}".`
            : "Nenhum espaço cadastrado ainda."}
        </p>
        {!searchQuery && createHref && canManage && (
          <Button asChild className="mt-4" size="sm">
            <Link href={createHref}>+ Cadastrar espaço</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Localização</TableHead>
          <TableHead>Modo</TableHead>
          <TableHead className="text-right">Valor padrão</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {spaces.map((s) => (
          <TableRow key={s.id} className={s.is_active ? "" : "opacity-60"}>
            <TableCell className="font-medium">
              <Link href={`${basePath}/${s.id}`} className="hover:underline">
                {s.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">{s.location ?? "—"}</TableCell>
            <TableCell>{MODE_LABEL[s.booking_mode]}</TableCell>
            <TableCell className="text-right">
              {s.default_price > 0 ? (
                formatCurrency(s.default_price)
              ) : (
                <Badge variant="secondary">Grátis</Badge>
              )}
            </TableCell>
            <TableCell>
              {s.is_active ? <Badge>Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="ghost" size="sm">
                <Link href={`${basePath}/${s.id}`}>Gerir</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
