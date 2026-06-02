import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductForm, listClassifications } from "@/modules/inventory";
import { listSuppliers } from "@/modules/suppliers";
import { resolveCompany } from "@/modules/tenancy";

export const metadata = { title: "Novo Produto — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function NewProductPage({ params }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);

  const [suppliers, classifications] = await Promise.all([
    listSuppliers(company.id, { onlyActive: true }),
    listClassifications(company.id),
  ]);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Novo Produto</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do produto</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/inventory`}>Cancelar</Link>
        </Button>
      </header>

      <div className="rounded-lg border bg-card p-6">
        <ProductForm suppliers={suppliers} classifications={classifications} />
      </div>
    </section>
  );
}
