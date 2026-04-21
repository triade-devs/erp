"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProductAction } from "../actions/create-product";
import type { Product } from "../types";
import type { ActionResult } from "@/lib/errors";

const UNITS = ["UN", "KG", "L", "CX", "M"] as const;
const initial: ActionResult = { ok: false };

type Props = {
  /** Quando passado, o form atua em modo de edição */
  product?: Product;
  /** Action de update vinculada ao produto específico (bind parcial) */
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function ProductForm({ product, updateAction }: Props) {
  const action = updateAction ?? createProductAction;
  const [state, formAction] = useFormState(action, initial);

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Salvo com sucesso");
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field
        label="SKU"
        name="sku"
        required
        defaultValue={product?.sku}
        error={state.fieldErrors?.sku?.[0]}
        placeholder="EX: PROD-001"
      />
      <Field
        label="Nome"
        name="name"
        required
        defaultValue={product?.name}
        error={state.fieldErrors?.name?.[0]}
        placeholder="Nome do produto"
      />

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={product?.description ?? ""}
          placeholder="Descrição opcional..."
        />
        {state.fieldErrors?.description && (
          <p className="text-sm text-red-600">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit">Unidade</Label>
        <Select name="unit" defaultValue={product?.unit ?? "UN"}>
          <SelectTrigger id="unit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Field
        label="Estoque mínimo"
        name="minStock"
        type="number"
        step="0.001"
        defaultValue={String(product?.min_stock ?? 0)}
        error={state.fieldErrors?.minStock?.[0]}
      />
      <Field
        label="Preço de custo (R$)"
        name="costPrice"
        type="number"
        step="0.01"
        defaultValue={String(product?.cost_price ?? 0)}
        error={state.fieldErrors?.costPrice?.[0]}
      />
      <Field
        label="Preço de venda (R$)"
        name="salePrice"
        type="number"
        step="0.01"
        defaultValue={String(product?.sale_price ?? 0)}
        error={state.fieldErrors?.salePrice?.[0]}
      />

      <div className="md:col-span-2 flex justify-end gap-2">
        <SubmitButton isEditing={!!product} />
      </div>
    </form>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  step?: string;
  defaultValue?: string;
  placeholder?: string;
};

function Field({ label, name, type = "text", required, error, step, defaultValue, placeholder }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={!!error}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar produto"}
    </Button>
  );
}
