import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { SortableHeader } from "@/components/ui/sortable-header";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { MovementWithProduct, PaginatedResult } from "../types";

type SortDir = "asc" | "desc";

type Props = Pick<
  PaginatedResult<MovementWithProduct>,
  "data" | "page" | "total" | "totalPages"
> & {
  basePath?: string;
  productId?: string;
  sortBy: string;
  sortDir: SortDir;
};

const MOVEMENT_LABELS: Record<string, string> = {
  in: "Entrada",
  out: "Saída",
  adjustment: "Ajuste",
};

const MOVEMENT_VARIANTS: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  in: "default",
  out: "destructive",
  adjustment: "secondary",
};

export function MovementTable({
  data,
  page,
  totalPages,
  total,
  basePath = "",
  productId,
  sortBy,
  sortDir,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        Nenhuma movimentação encontrada.
      </div>
    );
  }

  const buildSortHref = (col: string, dir: SortDir) => {
    const params = new URLSearchParams();
    params.set("sortBy", col);
    params.set("sortDir", dir);
    params.set("page", "1");
    if (productId) params.set("productId", productId);
    return `${basePath}?${params.toString()}`;
  };

  const sortProps = { currentSort: sortBy, currentDir: sortDir, buildHref: buildSortHref };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="created_at" label="Data" defaultDir="desc" {...sortProps} />
              {!productId && <TableHead>Produto</TableHead>}
              <SortableHeader column="movement_type" label="Tipo" {...sortProps} />
              <SortableHeader column="quantity" label="Quantidade" {...sortProps} align="right" />
              <TableHead className="text-right">Custo unit.</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="text-sm">{formatDate(movement.created_at)}</TableCell>
                {!productId && (
                  <TableCell>
                    <div className="font-medium">{movement.products?.name ?? "—"}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {movement.products?.sku}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <Badge variant={MOVEMENT_VARIANTS[movement.movement_type] ?? "secondary"}>
                    {MOVEMENT_LABELS[movement.movement_type] ?? movement.movement_type}
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

      <div className="sticky bottom-0 flex items-center justify-between border-t bg-background/95 px-1 py-3 text-sm text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span>
          {total} movimentaç{total !== 1 ? "ões" : "ão"}
        </span>
        <PaginationNav
          page={page}
          totalPages={totalPages}
          buildHref={(p) => {
            const params = new URLSearchParams();
            params.set("page", String(p));
            params.set("sortBy", sortBy);
            params.set("sortDir", sortDir);
            if (productId) params.set("productId", productId);
            return `${basePath}?${params.toString()}`;
          }}
        />
      </div>
    </div>
  );
}
