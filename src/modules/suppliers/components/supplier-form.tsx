"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
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
import { createSupplierAction } from "../actions/create-supplier";
import type { Supplier } from "../types";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type DocType = "cnpj" | "cpf";

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
        maxLength={30}
        onChange={(e) => {
          e.target.value = e.target.value.toUpperCase().slice(0, 30);
        }}
      />

      <DocumentField defaultValue={supplier?.document ?? ""} error={fieldErrors?.document?.[0]} />

      <Field
        label="Telefone"
        name="phone"
        defaultValue={supplier?.phone ?? ""}
        error={fieldErrors?.phone?.[0]}
        placeholder="(00) 00000-0000"
        onChange={(e) => {
          e.target.value = formatPhone(e.target.value);
        }}
      />
      <Field
        label="E-mail"
        name="email"
        type="email"
        defaultValue={supplier?.email ?? ""}
        error={fieldErrors?.email?.[0]}
        placeholder="contato@fornecedor.com"
        maxLength={50}
      />

      <div className="flex justify-end gap-2 md:col-span-2">
        <SubmitButton isEditing={!!supplier} />
      </div>
    </form>
  );
}

// ─── DocumentField ────────────────────────────────────────────────────────────

function detectDocType(value: string): DocType {
  const digits = value.replace(/\D/g, "");
  return digits.length <= 11 && !value.includes("/") ? "cpf" : "cnpj";
}

function formatCnpj(digits: string): string {
  const d = digits.slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatCpf(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function DocumentField({ defaultValue, error }: { defaultValue: string; error?: string }) {
  const [docType, setDocType] = useState<DocType>(() =>
    defaultValue ? detectDocType(defaultValue) : "cnpj",
  );
  const [value, setValue] = useState(() => defaultValue ?? "");

  function handleDocTypeChange(type: DocType) {
    setDocType(type);
    setValue("");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setValue(docType === "cnpj" ? formatCnpj(digits) : formatCpf(digits));
  }

  const maxLength = docType === "cnpj" ? 18 : 14;
  const placeholder = docType === "cnpj" ? "00.000.000/0001-00" : "000.000.000-00";

  return (
    <div className="space-y-2">
      <Label>Documento</Label>
      <div className="flex gap-2">
        <Select value={docType} onValueChange={(v) => handleDocTypeChange(v as DocType)}>
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cnpj">CNPJ</SelectItem>
            <SelectItem value="cpf">CPF</SelectItem>
          </SelectContent>
        </Select>
        <Input
          name="document"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={!!error}
          className="flex-1"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
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
  maxLength,
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
        maxLength={maxLength}
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
