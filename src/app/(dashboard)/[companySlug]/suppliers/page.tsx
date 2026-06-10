import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listSuppliers, SupplierTable } from "@/modules/suppliers";
import { resolveCompany } from "@/modules/tenancy";
import { Can } from "@/modules/authz";

export const metadata = { title: "Fornecedores — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function SuppliersPage({ params }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);
  const suppliers = await listSuppliers(company.id);

  const basePath = `/${companySlug}/suppliers`;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fornecedores — {company.name}</h1>
          <p className="text-sm text-muted-foreground">
            {suppliers.length} fornecedores cadastrados
          </p>
        </div>
        <Can permission="suppliers:supplier:create">
          <Button asChild>
            <Link href={`${basePath}/new`}>+ Novo fornecedor</Link>
          </Button>
        </Can>
      </header>

      <SupplierTable data={suppliers} basePath={basePath} createHref={`${basePath}/new`} />
    </section>
  );
}
