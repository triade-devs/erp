import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/modules/inventory";
import { getActiveCompanyId } from "@/modules/tenancy";

export const metadata = { title: "Dashboard — ERP" };

export default async function DashboardPage() {
  const companyId = (await getActiveCompanyId()) ?? "";
  const { data, total } = await listProducts(companyId, { onlyActive: true, pageSize: 5 });
  const lowStockCount = data.filter((p) => Number(p.stock) <= Number(p.min_stock)).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do sistema</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Produtos ativos" value={total} />
        <MetricCard label="Estoque baixo" value={lowStockCount} alert={lowStockCount > 0} />
      </div>

      {/* Atalhos */}
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/inventory">Ver estoque</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/inventory/movements">Registrar movimentação</Link>
        </Button>
      </div>
    </div>
  );
}

function MetricCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-5 ${alert ? "border-red-200 bg-red-50" : "bg-card"}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${alert ? "text-red-600" : ""}`}>{value}</p>
    </div>
  );
}
