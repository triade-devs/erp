import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getProduct, updateProductAction, listMovements } from "@/modules/inventory";
import { ProductForm } from "@/modules/inventory";
import { MovementTable } from "@/modules/inventory";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Produto — ERP" };

type Props = { params: { id: string } };

export default async function ProductDetailPage({ params }: Props) {
  const [product, movements] = await Promise.all([
    getProduct(params.id),
    listMovements({ productId: params.id, pageSize: 10 }),
  ]);

  if (!product) notFound();

  // Bind parcial: injeta o ID na action de update
  const updateAction = updateProductAction.bind(null, product.id);
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
          <Link href="/inventory">← Voltar</Link>
        </Button>
      </header>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Saldo atual" value={`${Number(product.stock).toFixed(3)} ${product.unit}`} />
        <MetricCard label="Estoque mínimo" value={`${Number(product.min_stock).toFixed(3)} ${product.unit}`} />
        <MetricCard label="Custo" value={formatCurrency(Number(product.cost_price))} />
        <MetricCard label="Venda" value={formatCurrency(Number(product.sale_price))} />
      </div>

      {/* Formulário de edição */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Editar produto</h2>
        <ProductForm product={product} updateAction={updateAction} />
      </div>

      {/* Histórico de movimentações */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Histórico de movimentações</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/inventory/movements?productId=${product.id}`}>Ver todas</Link>
          </Button>
        </div>
        <MovementTable
          data={movements.data}
          total={movements.total}
          page={movements.page}
          totalPages={movements.totalPages}
        />
      </div>
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
