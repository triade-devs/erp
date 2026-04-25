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
import { formatCurrency } from "@/lib/utils";
import type { PaginatedResult, Product } from "../types";

type Props = Pick<
  PaginatedResult<Product>,
  "data" | "page" | "pageSize" | "total" | "totalPages"
> & {
  basePath: string;
  searchQuery?: string;
  createHref?: string;
};

export function ProductTable({
  data,
  page,
  totalPages,
  total,
  basePath,
  searchQuery,
  createHref,
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

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Venda</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <ProductRow key={product.id} product={product} basePath={basePath} />
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} produto{total !== 1 ? "s" : ""}
        </span>
        <PaginationNav
          page={page}
          totalPages={totalPages}
          buildHref={(p) => {
            const params = new URLSearchParams();
            params.set("page", String(p));
            if (searchQuery) params.set("q", searchQuery);
            return `${basePath}?${params.toString()}`;
          }}
        />
      </div>
    </div>
  );
}

function ProductRow({ product, basePath }: { product: Product; basePath: string }) {
  const isLowStock = Number(product.stock) <= Number(product.min_stock);

  return (
    <TableRow>
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
        <span className={isLowStock ? "font-semibold text-red-600" : ""}>
          {Number(product.stock).toFixed(3)}
        </span>
      </TableCell>
      <TableCell className="text-right">{formatCurrency(Number(product.cost_price))}</TableCell>
      <TableCell className="text-right">{formatCurrency(Number(product.sale_price))}</TableCell>
      <TableCell>
        {isLowStock ? (
          <Badge variant="destructive">Estoque baixo</Badge>
        ) : product.is_active ? (
          <Badge variant="secondary">Ativo</Badge>
        ) : (
          <Badge variant="outline">Inativo</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}
