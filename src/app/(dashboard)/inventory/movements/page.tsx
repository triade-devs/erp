import { listMovements, listProducts } from "@/modules/inventory";
import { MovementForm } from "@/modules/inventory";
import { MovementTable } from "@/modules/inventory";

export const metadata = { title: "Movimentações — ERP" };

type Props = { searchParams: Promise<Record<string, string>> };

export default async function MovementsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [movements, products] = await Promise.all([
    listMovements(params),
    listProducts({ onlyActive: true, pageSize: 100 }),
  ]);

  const productOptions = products.data.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    stock: Number(p.stock),
  }));

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Movimentações de Estoque</h1>
        <p className="text-sm text-muted-foreground">Registre entradas, saídas e ajustes</p>
      </header>

      {/* Formulário de registro */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Nova movimentação</h2>
        {productOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre pelo menos um produto ativo para registrar movimentações.
          </p>
        ) : (
          <MovementForm products={productOptions} />
        )}
      </div>

      {/* Histórico */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Histórico</h2>
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
