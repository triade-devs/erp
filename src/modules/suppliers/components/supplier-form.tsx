"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSupplierAction } from "../actions/create-supplier";
import { lookupCep, lookupEmpresa } from "@/lib/enrichment-client";
import type { Supplier } from "../types";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type DocType = "cnpj" | "cpf";

// Países mais comuns no comércio com o Brasil
const COUNTRIES = [
  { value: "Brasil", label: "🇧🇷 Brasil" },
  { value: "Argentina", label: "🇦🇷 Argentina" },
  { value: "Alemanha", label: "🇩🇪 Alemanha" },
  { value: "China", label: "🇨🇳 China" },
  { value: "Coreia do Sul", label: "🇰🇷 Coreia do Sul" },
  { value: "Espanha", label: "🇪🇸 Espanha" },
  { value: "Estados Unidos", label: "🇺🇸 Estados Unidos" },
  { value: "França", label: "🇫🇷 França" },
  { value: "Itália", label: "🇮🇹 Itália" },
  { value: "Japão", label: "🇯🇵 Japão" },
  { value: "México", label: "🇲🇽 México" },
  { value: "Portugal", label: "🇵🇹 Portugal" },
  { value: "Reino Unido", label: "🇬🇧 Reino Unido" },
  { value: "Outro", label: "🌍 Outro" },
] as const;

// DDIs mais comuns
const DDI_LIST = [
  { value: "+55", label: "+55 🇧🇷" },
  { value: "+1", label: "+1  🇺🇸" },
  { value: "+44", label: "+44 🇬🇧" },
  { value: "+49", label: "+49 🇩🇪" },
  { value: "+33", label: "+33 🇫🇷" },
  { value: "+39", label: "+39 🇮🇹" },
  { value: "+34", label: "+34 🇪🇸" },
  { value: "+351", label: "+351 🇵🇹" },
  { value: "+54", label: "+54 🇦🇷" },
  { value: "+52", label: "+52 🇲🇽" },
  { value: "+81", label: "+81 🇯🇵" },
  { value: "+82", label: "+82 🇰🇷" },
  { value: "+86", label: "+86 🇨🇳" },
] as const;

type Props = {
  supplier?: Supplier;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function SupplierForm({ supplier, updateAction }: Props) {
  const action = (updateAction ?? createSupplierAction) as (
    prev: ActionResult,
    formData: FormData,
  ) => Promise<ActionResult>;
  const [state, formAction] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  // Campos controlados (autocomplete CNPJ/CEP preenche estes)
  const [country, setCountry] = useState(supplier?.country ?? "Brasil");
  const [name, setName] = useState(supplier?.name ?? "");
  const [stateUf, setStateUf] = useState(supplier?.state ?? "");
  const [city, setCity] = useState(supplier?.city ?? "");
  const [cep, setCep] = useState(supplier?.cep ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [ddi, setDdi] = useState(() => splitPhone(supplier?.phone ?? "").ddi);
  const [phoneNumber, setPhoneNumber] = useState(() => splitPhone(supplier?.phone ?? "").number);

  // Status da consulta de CNPJ (situação cadastral)
  const [cnpjActive, setCnpjActive] = useState<boolean | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  // Guarda contra respostas obsoletas quando o usuário redigita o CNPJ
  const cnpjLookupIdRef = useRef(0);

  const isBrazil = country === "Brasil";

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (state.ok) {
      if (!supplier) {
        formRef.current?.reset();
        setName("");
        setStateUf("");
        setCity("");
        setCep("");
        setEmail("");
        setDdi("+55");
        setPhoneNumber("");
        setCnpjActive(null);
      }
      toast.success(state.message ?? "Salvo com sucesso.");
      return;
    }
    if (state.message) toast.error(state.message);
  }, [state]);

  async function handleCnpjComplete(digits: string) {
    const reqId = ++cnpjLookupIdRef.current;
    setCnpjLoading(true);
    setCnpjActive(null);
    const data = await lookupEmpresa(digits);
    if (reqId !== cnpjLookupIdRef.current) return; // resposta obsoleta
    if (!data) {
      setCnpjLoading(false);
      return;
    }

    if (data.name) setName(data.name.toUpperCase().slice(0, 60));
    if (data.email) setEmail(data.email);
    if (data.phone) {
      setDdi("+55");
      setPhoneNumber(formatBrPhone(data.phone));
    }
    setCnpjActive(data.isActive);

    // CEP do CNPJ dispara ViaCEP para derivar cidade/estado (fonte única de endereço)
    if (data.cep) {
      setCep(data.cep);
      const viacep = await lookupCep(data.cep);
      if (reqId !== cnpjLookupIdRef.current) return; // resposta obsoleta
      if (viacep) {
        if (viacep.city) setCity(viacep.city);
        if (viacep.state) setStateUf(viacep.state);
      } else {
        if (data.city) setCity(data.city);
        if (data.state) setStateUf(data.state);
      }
    } else {
      if (data.city) setCity(data.city);
      if (data.state) setStateUf(data.state);
    }
    setCnpjLoading(false);
  }

  async function handleCepComplete(digits: string) {
    const data = await lookupCep(digits);
    if (data) {
      if (data.city) setCity(data.city);
      if (data.state) setStateUf(data.state);
      setCountry("Brasil");
    }
  }

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* País (define se há documento brasileiro) */}
      <CountryField
        value={country}
        defaultValue={supplier?.country ?? "Brasil"}
        onChange={setCountry}
      />

      {/* Documento — CNPJ é o primeiro campo a preencher (autocomplete) */}
      {isBrazil && (
        <DocumentField
          defaultValue={supplier?.document ?? ""}
          error={fieldErrors?.document?.[0]}
          onCnpjComplete={handleCnpjComplete}
          cnpjActive={cnpjActive}
          cnpjLoading={cnpjLoading}
        />
      )}

      {/* Nome (autopreenchido pelo CNPJ) */}
      <Field
        label="Nome"
        name="name"
        required
        value={name}
        error={fieldErrors?.name?.[0]}
        placeholder="NOME DO FORNECEDOR"
        maxLength={60}
        onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 60))}
      />

      {/* CEP — só para Brasil (dispara ViaCEP → cidade/estado) */}
      {isBrazil && <CepField value={cep} onChange={setCep} onComplete={handleCepComplete} />}

      {/* Estado e Cidade */}
      <Field
        label="Estado / Província"
        name="state"
        value={stateUf}
        placeholder={isBrazil ? "SP" : "California"}
        maxLength={60}
        onChange={(e) => setStateUf(e.target.value)}
      />
      <Field
        label="Cidade"
        name="city"
        value={city}
        placeholder={isBrazil ? "São Paulo" : "Los Angeles"}
        maxLength={60}
        onChange={(e) => setCity(e.target.value)}
      />

      {/* Telefone (autopreenchido pelo CNPJ) */}
      <PhoneField
        ddi={ddi}
        number={phoneNumber}
        onDdiChange={setDdi}
        onNumberChange={setPhoneNumber}
        isBrazil={isBrazil}
        error={fieldErrors?.phone?.[0]}
      />

      {/* E-mail (autopreenchido pelo CNPJ) */}
      <Field
        label="E-mail"
        name="email"
        type="email"
        value={email}
        error={fieldErrors?.email?.[0]}
        placeholder="contato@fornecedor.com"
        maxLength={50}
        onChange={(e) => setEmail(e.target.value)}
      />

      <div className="flex justify-end gap-2 md:col-span-2">
        <SubmitButton isEditing={!!supplier} />
      </div>
    </form>
  );
}

// ─── CountryField ─────────────────────────────────────────────────────────────

function CountryField({
  value,
  defaultValue,
  onChange,
}: {
  value: string;
  defaultValue: string;
  onChange: (v: string) => void;
}) {
  const [isOther, setIsOther] = useState(
    () => !COUNTRIES.some((c) => c.value === defaultValue && c.value !== "Outro"),
  );

  function handleSelect(v: string) {
    if (v === "Outro") {
      setIsOther(true);
      onChange("Outro");
    } else {
      setIsOther(false);
      onChange(v);
    }
  }

  return (
    <div className="space-y-2">
      <Label>País</Label>
      <Select
        name={isOther ? undefined : "country"}
        value={isOther ? "Outro" : value}
        onValueChange={handleSelect}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione o país" />
        </SelectTrigger>
        <SelectContent>
          {COUNTRIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isOther && (
        <Input
          name="country"
          placeholder="Nome do país"
          defaultValue={defaultValue !== "Outro" ? defaultValue : ""}
          maxLength={60}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// ─── CepField ─────────────────────────────────────────────────────────────────

function formatCep(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function CepField({
  value,
  onChange,
  onComplete,
}: {
  value: string;
  onChange: (digits: string) => void;
  onComplete: (digits: string) => void;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    onChange(digits);
    if (digits.length === 8) onComplete(digits);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="cep">CEP</Label>
      <Input
        id="cep"
        name="cep"
        inputMode="numeric"
        value={formatCep(value)}
        onChange={handleChange}
        placeholder="00000-000"
        maxLength={9}
      />
    </div>
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

function DocumentField({
  defaultValue,
  error,
  onCnpjComplete,
  cnpjActive,
  cnpjLoading,
}: {
  defaultValue: string;
  error?: string;
  onCnpjComplete: (digits: string) => void;
  cnpjActive: boolean | null;
  cnpjLoading: boolean;
}) {
  const [docType, setDocType] = useState<DocType>(() =>
    defaultValue ? detectDocType(defaultValue) : "cnpj",
  );
  const [value, setValue] = useState(defaultValue);

  function handleDocTypeChange(type: DocType) {
    setDocType(type);
    setValue("");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    setValue(docType === "cnpj" ? formatCnpj(digits) : formatCpf(digits));
    if (docType === "cnpj" && digits.length === 14) onCnpjComplete(digits);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Documento</Label>
        {docType === "cnpj" && cnpjLoading && (
          <span className="text-xs text-muted-foreground">Buscando empresa...</span>
        )}
        {docType === "cnpj" && !cnpjLoading && cnpjActive === true && (
          <Badge variant="secondary" className="text-xs">
            Situação: Ativa
          </Badge>
        )}
        {docType === "cnpj" && !cnpjLoading && cnpjActive === false && (
          <Badge variant="destructive" className="text-xs">
            Situação: Inativa
          </Badge>
        )}
      </div>
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
          placeholder={docType === "cnpj" ? "00.000.000/0001-00" : "000.000.000-00"}
          maxLength={docType === "cnpj" ? 18 : 14}
          aria-invalid={!!error}
          className="flex-1"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ─── PhoneField ───────────────────────────────────────────────────────────────

function formatBrPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function splitPhone(full: string): { ddi: string; number: string } {
  if (!full) return { ddi: "+55", number: "" };
  const match = full.match(/^(\+\d{1,4})\s?(.*)/);
  if (match) return { ddi: match[1]!, number: match[2] ?? "" };
  return { ddi: "+55", number: full };
}

function PhoneField({
  ddi,
  number,
  onDdiChange,
  onNumberChange,
  isBrazil,
  error,
}: {
  ddi: string;
  number: string;
  onDdiChange: (v: string) => void;
  onNumberChange: (v: string) => void;
  isBrazil: boolean;
  error?: string;
}) {
  const fullPhone = isBrazil ? number : `${ddi} ${number}`.trim();

  function handleBrChange(e: React.ChangeEvent<HTMLInputElement>) {
    onNumberChange(formatBrPhone(e.target.value));
  }

  return (
    <div className="space-y-2">
      <Label>Telefone</Label>
      <div className="flex gap-2">
        {!isBrazil && (
          <Select value={ddi} onValueChange={onDdiChange}>
            <SelectTrigger className="w-28 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DDI_LIST.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          inputMode="tel"
          value={number}
          onChange={isBrazil ? handleBrChange : (e) => onNumberChange(e.target.value)}
          placeholder={isBrazil ? "(00) 00000-0000" : "555 234-5678"}
          maxLength={isBrazil ? 15 : 20}
          aria-invalid={!!error}
          className="flex-1"
        />
      </div>
      <input type="hidden" name="phone" value={fullPhone} />
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
  value?: string;
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
  value,
  defaultValue,
  placeholder,
  maxLength,
  onChange,
}: FieldProps) {
  // Controlado quando `value` é fornecido; caso contrário, uncontrolled com defaultValue
  const controlled = value !== undefined;
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
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : defaultValue}
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
