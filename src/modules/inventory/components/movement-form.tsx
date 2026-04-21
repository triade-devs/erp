"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registerMovementAction } from "../actions/register-movement";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type ProductOption = { id: string; name: string; sku: string; stock: number };

export function MovementForm({ products }: { products: ProductOption[] }) {
  const [state, formAction] = useFormState(registerMovementAction, initial);

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Movimentação registrada");
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Produto */}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="productId">
          Produto <span className="text-red-500">*</span>
        </Label>
        <Select name="productId" required>
          <SelectTrigger id="productId">
            <SelectValue placeholder="Selecione um produto..." />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.sku} — {p.name}{" "}
                <span className="text-muted-foreground">(saldo: {p.stock.toFixed(3)})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.productId && (
          <p className="text-sm text-red-600">{state.fieldErrors.productId[0]}</p>
        )}
      </div>

      {/* Tipo */}
      <div className="space-y-2">
        <Label htmlFor="type">
          Tipo <span className="text-red-500">*</span>
        </Label>
        <Select name="type" defaultValue="in">
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in">Entrada</SelectItem>
            <SelectItem value="out">Saída</SelectItem>
            <SelectItem value="adjustment">Ajuste de saldo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quantidade */}
      <div className="space-y-2">
        <Label htmlFor="quantity">
          Quantidade <span className="text-red-500">*</span>
        </Label>
        <Input
          id="quantity"
          name="quantity"
          type="number"
          step="0.001"
          min="0.001"
          required
          placeholder="0.000"
          aria-invalid={!!state.fieldErrors?.quantity}
        />
        {state.fieldErrors?.quantity && (
          <p className="text-sm text-red-600">{state.fieldErrors.quantity[0]}</p>
        )}
      </div>

      {/* Custo unitário */}
      <div className="space-y-2">
        <Label htmlFor="unitCost">Custo unitário (R$)</Label>
        <Input id="unitCost" name="unitCost" type="number" step="0.01" min="0" placeholder="0.00" />
      </div>

      {/* Motivo */}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="reason">Motivo / Observação</Label>
        <Input id="reason" name="reason" placeholder="Opcional..." maxLength={500} />
      </div>

      <div className="md:col-span-2 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Registrar movimentação"}
    </Button>
  );
}
