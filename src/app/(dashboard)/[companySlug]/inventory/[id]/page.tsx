import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getProduct,
  updateProductAction,
  deleteProductAction,
  listMovements,
} from "@/modules/inventory";
import { ProductForm } from "@/modules/inventory";
import { MovementTable } from "@/modules/inventory";
import { formatCurrency } from "@/lib/utils";
import { resolveCompany } from "@/modules/tenancy";
import { Can } from "@/modules/authz";
import { DeleteProductForm } from "./delete-product-form";

export const metadata = { title: "Produto — ERP" };

type Props = {
  params: Promise<{ companySlug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductDetailPage({ params, searchParams }: Props) {
  const [resolvedParams, resolvedSearch] = await Promise.all([params, searchParams]);
  const { companySlug, id } = resolvedParams;
  const page = Number(resolvedSearch.page ?? 1) || 1;
  const company = await resolveCompany(companySlug);
  const sortBy = (resolvedSearch.sortBy as string) ?? "created_at";
  const sortDir: "asc" | "desc" = (resolvedSearch.sortDir as string) === "asc" ? "asc" : "desc";

  const [product, movements] = await Promise.all([
    getProduct(id, company.id),
    listMovements(company.id, { productId: id, pageSize: 10, page, sortBy, sortDir }),
  ]);

  if (!product) notFound();

  const updateAction = updateProductAction.bind(null, product.id);
  const deleteAction = deleteProductAction.bind(null, companySlug, product.id);
  const isLowStock = Number(product.stock) <= Number(product.min_stock);

  return (
    <section className="space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{product.name}</h1>
            {isLowStock && <Badge variant="destructive">Estoque baixo</Badge>}
            {!product.is_active && <Badge variant="outline">Inativo</Badge>}
          </div>
          <p className="font-mono text-sm text-muted-foreground">{product.sku}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/inventory`}>← Voltar</Link>
        </Button>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Saldo atual"
          value={`${Number(product.stock).toFixed(3)} ${product.unit}`}
        />
        <MetricCard
          label="Estoque mínimo"
          value={`${Number(product.min_stock).toFixed(3)} ${product.unit}`}
        />
        <MetricCard label="Custo" value={formatCurrency(Number(product.cost_price))} />
        <MetricCard label="Venda" value={formatCurrency(Number(product.sale_price))} />
      </div>

      {/* Formulário de edição */}
      <Can permission="inventory:product:update">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Editar produto</h2>
          <ProductForm product={product} updateAction={updateAction} />
        </div>
      </Can>

      {/* Zona de perigo */}
      <Can permission="inventory:product:delete">
        <div className="rounded-lg border border-destructive/30 bg-card p-6">
          <h2 className="mb-1 text-lg font-semibold text-destructive">Zona de perigo</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Desativa o produto e preserva o histórico de movimentações.
          </p>
          <DeleteProductForm deleteAction={deleteAction} isActive={product.is_active} />
        </div>
      </Can>

      {/* Histórico de movimentações */}
      <Can permission="movements:movement:read">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Histórico de movimentações</h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${companySlug}/inventory/movements?productId=${product.id}`}>
                Ver todas
              </Link>
            </Button>
          </div>
          <MovementTable
            data={movements.data}
            total={movements.total}
            page={movements.page}
            totalPages={movements.totalPages}
            basePath={`/${companySlug}/inventory/${id}`}
            productId={product.id}
            sortBy={sortBy}
            sortDir={sortDir}
          />
        </div>
      </Can>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
