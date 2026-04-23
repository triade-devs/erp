import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listProducts } from "@/modules/inventory";
import { ProductTable } from "@/modules/inventory";
import { resolveCompany } from "@/modules/tenancy";
import { Can } from "@/modules/authz";

export const metadata = { title: "Estoque — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<Record<string, string>>;
};

export default async function InventoryPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);
  const rawParams = await searchParams;
  const { data, total, page, pageSize, totalPages } = await listProducts(company.id, rawParams);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Estoque — {company.name}</h1>
          <p className="text-sm text-muted-foreground">{total} produtos cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Can permission="movements:movement:read">
            <Button asChild variant="outline">
              <Link href={`/${companySlug}/inventory/movements`}>Movimentações</Link>
            </Button>
          </Can>
          <Can permission="inventory:product:create">
            <Button asChild>
              <Link href={`/${companySlug}/inventory/new`}>+ Novo produto</Link>
            </Button>
          </Can>
        </div>
      </header>

      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={rawParams.q ?? ""}
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
        basePath={`/${companySlug}/inventory`}
      />
    </section>
  );
}
