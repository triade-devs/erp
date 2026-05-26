import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission } from "@/modules/authz";
import { listWarehouses } from "@/modules/inventory";
import { resolveCompany } from "@/modules/tenancy";
import { AppError } from "@/lib/errors";
import { WarehouseFormDialog } from "./warehouse-form-dialog";

export const metadata = { title: "Depósitos — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function WarehousesPage({ params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  const [warehouses, canManage] = await Promise.all([
    listWarehouses(company.id),
    hasPermission(company.id, "core:inventory:manage"),
  ]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Depósitos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie os depósitos disponíveis para estoque e escopos de role.
          </p>
        </div>
        {canManage && <WarehouseFormDialog companyId={company.id} mode="create" />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Depósitos cadastrados</CardTitle>
          <CardDescription>
            {warehouses.length} {warehouses.length === 1 ? "depósito registrado" : "depósitos registrados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {warehouses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum depósito cadastrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{warehouse.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {warehouse.isActive
                        ? "Disponível para uso nas operações e escopos."
                        : "Inativo: permanece no histórico, mas não deve ser usado em novas operações."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Badge variant={warehouse.isActive ? "default" : "secondary"}>
                      {warehouse.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                    {canManage && (
                      <WarehouseFormDialog
                        companyId={company.id}
                        mode="edit"
                        warehouse={warehouse}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
