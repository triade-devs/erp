"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupplierAction } from "../actions/create-supplier";
import type { Supplier } from "../types";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type Props = {
  supplier?: Supplier;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function SupplierForm({ supplier, updateAction }: Props) {
  // createSupplierAction retorna data extra (id,name) que o form de edição ignora
  const action = (updateAction ?? createSupplierAction) as (
    prev: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  const [state, formAction] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (state.ok) {
      if (!supplier) formRef.current?.reset();
      toast.success(state.message ?? "Salvo com sucesso.");
      return;
    }
    if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field
        label="Nome"
        name="name"
        required
        defaultValue={supplier?.name}
        error={fieldErrors?.name?.[0]}
        placeholder="NOME DO FORNECEDOR"
        onChange={(e) => {
          e.target.value = e.target.value.toUpperCase();
        }}
      />
      <Field
        label="CNPJ / CPF"
        name="document"
        defaultValue={supplier?.document ?? ""}
        error={fieldErrors?.document?.[0]}
        placeholder="00.000.000/0001-00"
      />
      <Field
        label="Telefone"
        name="phone"
        defaultValue={supplier?.phone ?? ""}
        error={fieldErrors?.phone?.[0]}
        placeholder="(00) 00000-0000"
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        defaultValue={supplier?.email ?? ""}
        error={fieldErrors?.email?.[0]}
        placeholder="contato@fornecedor.com"
      />

      <div className="flex justify-end gap-2 md:col-span-2">
        <SubmitButton isEditing={!!supplier} />
      </div>
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
};

function Field({
  label,
  name,
  type = "text",
  required,
  error,
  defaultValue,
  placeholder,
  onChange,
}: FieldProps) {
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
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={!!error}
        onChange={onChange}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar fornecedor"}
    </Button>
  );
}
