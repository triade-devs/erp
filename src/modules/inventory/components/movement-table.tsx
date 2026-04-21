import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaginatedResult, StockMovement } from "../types";

type Props = Pick<PaginatedResult<StockMovement>, "data" | "page" | "total" | "totalPages">;

const MOVEMENT_LABELS: Record<StockMovement["movement_type"], string> = {
  in: "Entrada",
  out: "Saída",
  adjustment: "Ajuste",
};

const MOVEMENT_VARIANTS: Record<
  StockMovement["movement_type"],
  "default" | "destructive" | "secondary" | "outline"
> = {
  in: "default",
  out: "destructive",
  adjustment: "secondary",
};

export function MovementTable({ data, page, totalPages, total }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        Nenhuma movimentação encontrada.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Quantidade</TableHead>
              <TableHead className="text-right">Custo unit.</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="text-sm">{formatDate(movement.created_at)}</TableCell>
                <TableCell>
                  <Badge variant={MOVEMENT_VARIANTS[movement.movement_type]}>
                    {MOVEMENT_LABELS[movement.movement_type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {Number(movement.quantity).toFixed(3)}
                </TableCell>
                <TableCell className="text-right">
                  {movement.unit_cost != null ? formatCurrency(Number(movement.unit_cost)) : "—"}
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                  {movement.reason ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} movimentaç{total !== 1 ? "ões" : "ão"}
        </span>
        {totalPages > 1 && (
          <span>
            Página {page} de {totalPages}
          </span>
        )}
      </div>
    </div>
  );
}
