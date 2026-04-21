import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listProducts } from "@/modules/inventory";
import { ProductTable } from "@/modules/inventory";

export const metadata = { title: "Estoque — ERP" };

type Props = { searchParams: Promise<Record<string, string>> };

export default async function InventoryPage({ searchParams }: Props) {
  const params = await searchParams;
  const { data, total, page, pageSize, totalPages } = await listProducts(params);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Estoque</h1>
          <p className="text-sm text-muted-foreground">{total} produtos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/inventory/movements">Movimentações</Link>
          </Button>
          <Button asChild>
            <Link href="/inventory/new">+ Novo produto</Link>
          </Button>
        </div>
      </header>

      {/* Busca */}
      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por nome ou SKU..."
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <ProductTable
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
      />
    </section>
  );
}
