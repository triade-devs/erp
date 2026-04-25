import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listProducts } from "@/modules/inventory";
import { getActiveCompanyId, getActiveCompanySlug } from "@/modules/tenancy";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Dashboard — ERP" };

export default async function DashboardPage() {
  const [companyId, companySlug] = await Promise.all([
    getActiveCompanyId(),
    getActiveCompanySlug(),
  ]);

  const { data: allProducts, total } = await listProducts(companyId ?? "", {
    onlyActive: true,
    pageSize: 100,
  });

  const lowStockProducts = allProducts.filter((p) => Number(p.stock) <= Number(p.min_stock));
  const lowStockCount = lowStockProducts.length;
  const totalStockValue = allProducts.reduce(
    (sum, p) => sum + Number(p.stock) * Number(p.cost_price),
    0,
  );

  const inventoryHref = companySlug ? `/${companySlug}/inventory` : "/";
  const movementsHref = companySlug ? `/${companySlug}/inventory/movements` : "/";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Produtos ativos" value={String(total)} />
        <MetricCard label="Estoque baixo" value={String(lowStockCount)} alert={lowStockCount > 0} />
        <MetricCard label="Valor em estoque" value={formatCurrency(totalStockValue)} />
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href={inventoryHref}>Ver estoque</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={movementsHref}>Registrar movimentação</Link>
        </Button>
      </div>

      {lowStockCount > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Produtos com estoque baixo
          </h2>
          <div className="divide-y rounded-lg border">
            {lowStockProducts.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`${inventoryHref}/${p.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="font-mono text-xs text-muted-foreground">{p.sku}</p>
                </div>
                <div className="text-right">
                  <Badge variant="destructive" className="text-xs">
                    {Number(p.stock).toFixed(3)} {p.unit}
                  </Badge>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    mín: {Number(p.min_stock).toFixed(3)}
                  </p>
                </div>
              </div>
            ))}
            {lowStockCount > 5 && (
              <div className="px-4 py-3 text-center">
                <Link href={inventoryHref} className="text-sm text-primary hover:underline">
                  Ver mais {lowStockCount - 5} produto{lowStockCount - 5 !== 1 ? "s" : ""}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-5 ${alert ? "border-red-200 bg-red-50" : "bg-card"}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${alert ? "text-red-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}
