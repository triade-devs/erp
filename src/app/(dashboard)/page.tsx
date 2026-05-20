import Link from "next/link";
import { Package, AlertTriangle, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInventoryStats } from "@/modules/inventory";
import { getActiveCompanyId, getActiveCompanySlug } from "@/modules/tenancy";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Dashboard — ERP" };

export default async function DashboardPage() {
  const [companyId, companySlug] = await Promise.all([
    getActiveCompanyId(),
    getActiveCompanySlug(),
  ]);

  const { totalActive, lowStockCount, totalStockValue, lowStockProducts } = await getInventoryStats(
    companyId ?? "",
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
        <MetricCard
          label="Produtos ativos"
          value={String(totalActive)}
          icon={<Package className="h-4 w-4" />}
          accent="blue"
        />
        <MetricCard
          label="Estoque baixo"
          value={String(lowStockCount)}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={lowStockCount > 0 ? "red" : "blue"}
          alert={lowStockCount > 0}
        />
        <MetricCard
          label="Valor em estoque"
          value={formatCurrency(totalStockValue)}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="blue"
        />
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
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Produtos com estoque baixo
            </h2>
            <Button asChild variant="ghost" size="sm" className="h-7 gap-1 text-xs">
              <Link href={inventoryHref}>
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
          <div className="divide-y rounded-lg border bg-card">
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

type AccentColor = "blue" | "red";

function MetricCard({
  label,
  value,
  icon,
  accent,
  alert,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: AccentColor;
  alert?: boolean;
}) {
  const accentClasses: Record<AccentColor, string> = {
    blue: "border-t-primary text-primary",
    red: "border-t-destructive text-destructive",
  };

  return (
    <div
      className={`rounded-lg border border-t-2 bg-card p-5 ${alert ? "border-destructive/20 bg-destructive/5" : ""} ${accentClasses[accent]}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={`bg-current/10 rounded-md p-1.5 ${accentClasses[accent]}`}>{icon}</span>
      </div>
      <p
        className={`text-3xl font-bold tabular-nums ${alert ? "text-destructive" : "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
