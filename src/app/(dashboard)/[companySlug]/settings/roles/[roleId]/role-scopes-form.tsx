"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/errors";
import { type Warehouse } from "@/modules/inventory/client";
import { updateRoleScopesAction } from "@/modules/tenancy/client";

type Props = {
  companyId: string;
  roleId: string;
  warehouses: Warehouse[];
  selectedWarehouseIds: string[];
};

const initialState: ActionResult = { ok: false };

export function RoleScopesForm({ companyId, roleId, warehouses, selectedWarehouseIds }: Props) {
  const router = useRouter();
  const hasMountedRef = useRef(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedWarehouseIds);
  const [state, formAction, isPending] = useActionState(
    async (_prevState: ActionResult, formData: FormData) => {
      const nextSelectedIds = formData.getAll("warehouseIds").map(String);
      return updateRoleScopesAction(companyId, roleId, "warehouse", nextSelectedIds);
    },
    initialState,
  );

  useEffect(() => {
    setSelectedIds(selectedWarehouseIds);
  }, [selectedWarehouseIds]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (state.ok) {
      toast.success(state.message ?? "Escopos atualizados com sucesso.");
      router.refresh();
      return;
    }

    if (state.message) {
      toast.error(state.message);
    }
  }, [router, state]);

  function handleCheckedChange(warehouseId: string, checked: boolean | "indeterminate") {
    setSelectedIds((current) => {
      if (checked === true) {
        return current.includes(warehouseId) ? current : [...current, warehouseId];
      }

      return current.filter((id) => id !== warehouseId);
    });
  }

  const isUnrestricted = selectedIds.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escopo por depósito</CardTitle>
        <CardDescription>
          Selecione os depósitos aos quais esta role terá acesso. Sem seleção = acesso irrestrito.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isUnrestricted && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta role está sem restrição de depósito no momento.
            </AlertDescription>
          </Alert>
        )}

        <form action={formAction} className="space-y-4">
          {selectedIds.map((warehouseId) => (
            <input key={warehouseId} type="hidden" name="warehouseIds" value={warehouseId} />
          ))}

          {warehouses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum depósito cadastrado. Cadastre um depósito para configurar escopos específicos.
            </p>
          ) : (
            <div className="space-y-3">
              {warehouses.map((warehouse) => (
                <div
                  key={warehouse.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`warehouse-scope-${warehouse.id}`}
                      checked={selectedIds.includes(warehouse.id)}
                      onCheckedChange={(checked) => handleCheckedChange(warehouse.id, checked)}
                      disabled={isPending}
                    />
                    <Label
                      htmlFor={`warehouse-scope-${warehouse.id}`}
                      className="cursor-pointer leading-none"
                    >
                      {warehouse.name}
                    </Label>
                  </div>
                  {!warehouse.isActive && (
                    <span className="text-xs text-muted-foreground">Inativo</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {!state.ok && state.message && <p className="text-sm text-red-600">{state.message}</p>}

          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Salvar escopos
    </Button>
  );
}
