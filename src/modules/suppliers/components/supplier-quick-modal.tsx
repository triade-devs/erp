"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createSupplierAction } from "../actions/create-supplier";
import type { ActionResult } from "@/lib/errors";

type CreatedSupplier = { id: string; name: string };
const initial: ActionResult<CreatedSupplier> = { ok: false };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (supplier: CreatedSupplier) => void;
};

export function SupplierQuickModal({ open, onOpenChange, onCreated }: Props) {
  const [state, formAction] = useActionState(createSupplierAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (state.ok) {
      toast.success("Fornecedor cadastrado.");
      formRef.current?.reset();
      onOpenChange(false);
      if (state.data) onCreated(state.data);
      return;
    }
    if (state.message) toast.error(state.message);
  }, [state, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Novo fornecedor</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="qm-name">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="qm-name"
              name="name"
              required
              placeholder="NOME DO FORNECEDOR"
              onChange={(e) => {
                e.target.value = e.target.value.toUpperCase();
              }}
              aria-invalid={!!fieldErrors?.name}
            />
            {fieldErrors?.name && <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="qm-document">CNPJ</Label>
            <Input
              id="qm-document"
              name="document"
              inputMode="numeric"
              placeholder="00.000.000/0001-00"
              maxLength={18}
              onChange={(e) => {
                const d = e.target.value.replace(/\D/g, "").slice(0, 14);
                const parts = [
                  d.slice(0, 2),
                  d.slice(2, 5),
                  d.slice(5, 8),
                  d.slice(8, 12),
                  d.slice(12),
                ].filter(Boolean);
                let formatted = parts[0] ?? "";
                if (parts[1]) formatted += `.${parts[1]}`;
                if (parts[2]) formatted += `.${parts[2]}`;
                if (parts[3]) formatted += `/${parts[3]}`;
                if (parts[4]) formatted += `-${parts[4]}`;
                e.target.value = formatted;
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <QuickSubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Cadastrar"}
    </Button>
  );
}
