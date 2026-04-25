import { listMovements, listProducts } from "@/modules/inventory";
import { MovementForm } from "@/modules/inventory";
import { MovementTable } from "@/modules/inventory";
import { resolveCompany } from "@/modules/tenancy";
import { Can } from "@/modules/authz";

export const metadata = { title: "Movimentações — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<Record<string, string>>;
};

export default async function MovementsPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);
  const rawParams = await searchParams;

  const [movements, products] = await Promise.all([
    listMovements(company.id, rawParams),
    listProducts(company.id, { onlyActive: true, pageSize: 100 }),
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
        <h1 className="text-2xl font-semibold">Movimentações de Estoque — {company.name}</h1>
        <p className="text-sm text-muted-foreground">Registre entradas, saídas e ajustes</p>
      </header>

      {/* Formulário de registro — apenas para quem pode criar movimentações */}
      <Can permission="movements:movement:create">
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
      </Can>

      {/* Histórico */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Histórico</h2>
        <MovementTable
          data={movements.data}
          total={movements.total}
          page={movements.page}
          totalPages={movements.totalPages}
          basePath={`/${companySlug}/inventory/movements`}
        />
      </div>
    </section>
  );
}
