import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SupplierForm } from "@/modules/suppliers";
import { resolveCompany } from "@/modules/tenancy";

export const metadata = { title: "Novo Fornecedor — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function NewSupplierPage({ params }: Props) {
  const { companySlug } = await params;
  await resolveCompany(companySlug);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Novo Fornecedor</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do fornecedor</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/suppliers`}>Cancelar</Link>
        </Button>
      </header>

      <div className="rounded-lg border bg-card p-6">
        <SupplierForm />
      </div>
    </section>
  );
}
