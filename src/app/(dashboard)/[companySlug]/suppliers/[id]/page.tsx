import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getSupplier,
  updateSupplierAction,
  deactivateSupplierAction,
  SupplierForm,
} from "@/modules/suppliers";
import { resolveCompany } from "@/modules/tenancy";
import { Can } from "@/modules/authz";
import { DeactivateSupplierForm } from "./deactivate-supplier-form";

export const metadata = { title: "Fornecedor — ERP" };

type Props = {
  params: Promise<{ companySlug: string; id: string }>;
};

export default async function SupplierDetailPage({ params }: Props) {
  const { companySlug, id } = await params;
  const company = await resolveCompany(companySlug);
  const supplier = await getSupplier(id, company.id);

  if (!supplier) notFound();

  const updateAction = updateSupplierAction.bind(null, supplier.id);
  const deactivateAction = deactivateSupplierAction.bind(null, company.id, supplier.id);

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{supplier.name}</h1>
            {!supplier.is_active && <Badge variant="outline">Inativo</Badge>}
          </div>
          {supplier.document && (
            <p className="text-sm text-muted-foreground">{supplier.document}</p>
          )}
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/suppliers`}>← Voltar</Link>
        </Button>
      </header>

      <Can permission="suppliers:supplier:update">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Editar fornecedor</h2>
          <SupplierForm supplier={supplier} updateAction={updateAction} />
        </div>
      </Can>

      <Can permission="suppliers:supplier:delete">
        <div className="rounded-lg border border-destructive/30 bg-card p-6">
          <h2 className="mb-1 text-lg font-semibold text-destructive">Zona de perigo</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Desativa o fornecedor. Produtos vinculados não são afetados.
          </p>
          <DeactivateSupplierForm
            deactivateAction={deactivateAction}
            isActive={supplier.is_active}
          />
        </div>
      </Can>
    </section>
  );
}
