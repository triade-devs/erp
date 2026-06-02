import Link from "next/link";
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
import type { Supplier } from "../types";

type Props = {
  data: Supplier[];
  basePath: string;
  createHref?: string;
};

export function SupplierTable({ data, basePath, createHref }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Nenhum fornecedor cadastrado ainda.</p>
        {createHref && (
          <Button asChild className="mt-4" size="sm">
            <Link href={createHref}>+ Cadastrar fornecedor</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Documento</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((supplier) => (
            <TableRow key={supplier.id} className={!supplier.is_active ? "opacity-60" : undefined}>
              <TableCell>
                <Link href={`${basePath}/${supplier.id}`} className="font-medium hover:underline">
                  {supplier.name}
                </Link>
              </TableCell>
              <TableCell>{supplier.document ?? "—"}</TableCell>
              <TableCell>{supplier.phone ?? "—"}</TableCell>
              <TableCell>{supplier.email ?? "—"}</TableCell>
              <TableCell>
                {supplier.is_active ? (
                  <Badge variant="secondary">Ativo</Badge>
                ) : (
                  <Badge variant="outline">Inativo</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
