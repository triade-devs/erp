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
import { PaginationNav } from "@/components/ui/pagination-nav";
import { SortableHeader } from "@/components/ui/sortable-header";
import { formatCurrency } from "@/lib/utils";
import { reactivateProductAction } from "../actions/reactivate-product";
import { ReactivateProductButton } from "./reactivate-product-button";
import type { PaginatedResult, Product } from "../types";

type SortDir = "asc" | "desc";

type Props = Pick<
  PaginatedResult<Product>,
  "data" | "page" | "pageSize" | "total" | "totalPages"
> & {
  basePath: string;
  searchQuery?: string;
  createHref?: string;
  showInactive?: boolean;
  sortBy: string;
  sortDir: SortDir;
};

export function ProductTable({
  data,
  page,
  totalPages,
  total,
  basePath,
  searchQuery,
  createHref,
  showInactive,
  sortBy,
  sortDir,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {searchQuery
            ? `Nenhum produto encontrado para "${searchQuery}".`
            : "Nenhum produto cadastrado ainda."}
        </p>
        {!searchQuery && createHref && (
          <Button asChild className="mt-4" size="sm">
            <Link href={createHref}>+ Cadastrar produto</Link>
          </Button>
        )}
      </div>
    );
  }

  const buildSortHref = (col: string, dir: SortDir) => {
    const params = new URLSearchParams();
    params.set("sortBy", col);
    params.set("sortDir", dir);
    params.set("page", "1");
    if (searchQuery) params.set("q", searchQuery);
    if (showInactive) params.set("inactive", "true");
    return `${basePath}?${params.toString()}`;
  };

  const sortProps = { currentSort: sortBy, currentDir: sortDir, buildHref: buildSortHref };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader column="sku" label="SKU" {...sortProps} />
              <SortableHeader column="name" label="Produto" {...sortProps} />
              <TableHead>Unidade</TableHead>
              <SortableHeader column="stock" label="Estoque" {...sortProps} align="right" />
              <SortableHeader column="cost_price" label="Custo" {...sortProps} align="right" />
              <SortableHeader column="sale_price" label="Venda" {...sortProps} align="right" />
              <SortableHeader column="is_active" label="Status" {...sortProps} />
              {showInactive && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                basePath={basePath}
                showActions={showInactive}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between border-t bg-background/95 px-1 py-3 text-sm text-muted-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span>
          {total} produto{total !== 1 ? "s" : ""}
        </span>
        <PaginationNav
          page={page}
          totalPages={totalPages}
          buildHref={(p) => {
            const params = new URLSearchParams();
            params.set("page", String(p));
            params.set("sortBy", sortBy);
            params.set("sortDir", sortDir);
            if (searchQuery) params.set("q", searchQuery);
            if (showInactive) params.set("inactive", "true");
            return `${basePath}?${params.toString()}`;
          }}
        />
      </div>
    </div>
  );
}

function ProductRow({
  product,
  basePath,
  showActions,
}: {
  product: Product;
  basePath: string;
  showActions?: boolean;
}) {
  const isLowStock = Number(product.stock) <= Number(product.min_stock);

  return (
    <TableRow className={!product.is_active ? "opacity-60" : undefined}>
      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
      <TableCell>
        <Link href={`${basePath}/${product.id}`} className="font-medium hover:underline">
          {product.name}
        </Link>
        {product.description && (
          <p className="truncate text-xs text-muted-foreground" title={product.description}>
            {product.description.slice(0, 60)}
            {product.description.length > 60 ? "..." : ""}
          </p>
        )}
      </TableCell>
      <TableCell>{product.unit}</TableCell>
      <TableCell className="text-right">
        <span className={isLowStock && product.is_active ? "font-semibold text-red-600" : ""}>
          {Number(product.stock).toFixed(3)}
        </span>
      </TableCell>
      <TableCell className="text-right">{formatCurrency(Number(product.cost_price))}</TableCell>
      <TableCell className="text-right">{formatCurrency(Number(product.sale_price))}</TableCell>
      <TableCell>
        {!product.is_active ? (
          <Badge variant="outline">Inativo</Badge>
        ) : isLowStock ? (
          <Badge variant="destructive">Estoque baixo</Badge>
        ) : (
          <Badge variant="secondary">Ativo</Badge>
        )}
      </TableCell>
      {showActions && (
        <TableCell>
          {!product.is_active && (
            <ReactivateProductButton
              productId={product.id}
              onReactivate={reactivateProductAction}
            />
          )}
        </TableCell>
      )}
    </TableRow>
  );
}
