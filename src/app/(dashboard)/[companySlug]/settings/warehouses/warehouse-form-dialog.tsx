"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, PencilIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ActionResult } from "@/lib/errors";
import {
  createWarehouseAction,
  toggleWarehouseActiveAction,
  type Warehouse,
  updateWarehouseAction,
} from "@/modules/inventory/client";

type Mode = "create" | "edit";

type Props = {
  companyId: string;
  mode: Mode;
  warehouse?: Warehouse;
};

const initialState: ActionResult = { ok: false };

export function WarehouseFormDialog({ companyId, mode, warehouse }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [isActive, setIsActive] = useState(warehouse?.isActive ?? true);
  const [isToggling, startToggle] = useTransition();
  const [state, formAction, isPending] = useActionState(
    async (prevState: ActionResult, formData: FormData) => {
      if (mode === "create") {
        return createWarehouseAction(companyId, prevState, formData);
      }

      return updateWarehouseAction(companyId, warehouse!.id, prevState, formData);
    },
    initialState,
  );

  const fieldErrors = !state.ok && "fieldErrors" in state ? state.fieldErrors : undefined;
  const isCreate = mode === "create";

  useEffect(() => {
    setIsActive(warehouse?.isActive ?? true);
  }, [warehouse?.isActive]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (state.ok) {
      if (isCreate) {
        formRef.current?.reset();
      }
      toast.success(state.message ?? "Depósito salvo com sucesso.");
      setOpen(false);
      router.refresh();
      return;
    }

    if (state.message) {
      toast.error(state.message);
    }
  }, [isCreate, router, state]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      formRef.current?.reset();
      setIsActive(warehouse?.isActive ?? true);
    }
  }

  function handleToggle(nextChecked: boolean) {
    if (!warehouse) return;

    startToggle(async () => {
      const result = await toggleWarehouseActiveAction(companyId, warehouse.id, nextChecked);
      if (result.ok) {
        setIsActive(nextChecked);
        toast.success(result.message ?? "Status atualizado com sucesso.");
        router.refresh();
        return;
      }

      toast.error(result.message ?? "Erro ao atualizar status do depósito.");
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={isCreate ? "default" : "ghost"} size={isCreate ? "default" : "icon"}>
          {isCreate ? (
            "+ Novo depósito"
          ) : (
            <>
              <PencilIcon className="h-4 w-4" />
              <span className="sr-only">Editar depósito</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCreate ? "Novo depósito" : "Editar depósito"}</DialogTitle>
          <DialogDescription>
            {isCreate
              ? "Cadastre um depósito para usar no estoque e nos escopos de roles."
              : "Atualize o nome e o status deste depósito."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${mode}-${warehouse?.id ?? "new"}`}>
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id={`name-${mode}-${warehouse?.id ?? "new"}`}
              name="name"
              defaultValue={warehouse?.name ?? ""}
              placeholder="Ex.: Matriz, Filial SP"
              required
              disabled={isPending || isToggling}
              aria-invalid={!!fieldErrors?.name}
            />
            {fieldErrors?.name && <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>}
          </div>

          {!isCreate && warehouse && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Depósito ativo</p>
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Disponível para novas operações." : "Mantido apenas para histórico."}
                </p>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                disabled={isPending || isToggling}
              />
            </div>
          )}

          {!state.ok && state.message && <p className="text-sm text-red-600">{state.message}</p>}

          <SubmitButton isCreate={isCreate} disabled={isPending || isToggling} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ isCreate, disabled }: { isCreate: boolean; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <Button type="submit" disabled={isDisabled} className="w-full">
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isCreate ? "Criar depósito" : "Salvar alterações"}
    </Button>
  );
}
