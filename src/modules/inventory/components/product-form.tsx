"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
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
import { usePriceInput } from "@/lib/price-formatter";
import {
  searchNcm,
  lookupBarcode,
  lookupNcm,
  type NcmItem,
  type BarcodeData,
} from "@/lib/enrichment-client";
import { Badge } from "@/components/ui/badge";
import { unitFromQuantity, type ProductUnit } from "../services/quantity-parser";
import type { Product } from "../types";
import type { ActionResult } from "@/lib/errors";
import type { Classification } from "../queries/list-classifications";

export type SupplierOption = { id: string; name: string };

type QuickModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (supplier: SupplierOption) => void;
};

const UNITS = ["UN", "KG", "L", "CX", "M"] as const;
const initial: ActionResult = { ok: false };

type Props = {
  product?: Product;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  suppliers?: SupplierOption[];
  classifications?: Classification[];
  /** Componente de modal de cadastro rápido de fornecedor — injetado pela página (server component). */
  QuickModal?: React.ComponentType<QuickModalProps>;
};

export function ProductForm({
  product,
  updateAction,
  suppliers = [],
  classifications = [],
  QuickModal,
}: Props) {
  const action = updateAction ?? createProductAction;
  const [state, formAction] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  // Nome e descrição controlados (autocomplete NCM/EAN pode sugerir)
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [unit, setUnit] = useState<ProductUnit>((product?.unit as ProductUnit) ?? "UN");

  // Suppliers (pode crescer com quick-modal)
  const [supplierList, setSupplierList] = useState(suppliers);
  const [selectedSupplierId, setSelectedSupplierId] = useState(product?.supplier_id ?? "");
  const [quickModalOpen, setQuickModalOpen] = useState(false);

  // Classificações encadeadas (filter client-side por parent_id)
  const departments = classifications.filter((c) => c.level === "department");
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => {
    if (!product?.classification_id) return "";
    const own = classifications.find((c) => c.id === product.classification_id);
    if (!own) return "";
    if (own.level === "department") return own.id;
    const parent = classifications.find((c) => c.id === own.parent_id);
    if (!parent) return "";
    if (parent.level === "department") return parent.id;
    const gp = classifications.find((c) => c.id === parent.parent_id);
    return gp?.id ?? "";
  });
  const [selectedCatId, setSelectedCatId] = useState<string>(() => {
    if (!product?.classification_id) return "";
    const own = classifications.find((c) => c.id === product.classification_id);
    if (!own) return "";
    if (own.level === "category") return own.id;
    if (own.level === "brand") return own.parent_id ?? "";
    return "";
  });
  const [selectedBrandId, setSelectedBrandId] = useState<string>(() => {
    if (!product?.classification_id) return "";
    const own = classifications.find((c) => c.id === product.classification_id);
    return own?.level === "brand" ? own.id : "";
  });

  const categories = classifications.filter(
    (c) => c.level === "category" && c.parent_id === selectedDeptId,
  );
  const brands = classifications.filter(
    (c) => c.level === "brand" && c.parent_id === selectedCatId,
  );

  // classificationId = nível mais específico selecionado
  const classificationId = selectedBrandId || selectedCatId || selectedDeptId;

  // Price inputs
  const costPriceInput = usePriceInput(
    product?.cost_price != null ? String(product.cost_price) : "",
  );
  const salePriceInput = usePriceInput(
    product?.sale_price != null ? String(product.sale_price) : "",
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (state.ok) {
      if (!product) {
        formRef.current?.reset();
        setName("");
        setDescription("");
        setUnit("UN");
      }
      toast.success(state.message ?? "Salvo com sucesso.");
      return;
    }
    if (state.message) toast.error(state.message);
  }, [state]);

  function handleSupplierCreated(newSupplier: SupplierOption) {
    setSupplierList((prev) => [...prev, { id: newSupplier.id, name: newSupplier.name }]);
    setSelectedSupplierId(newSupplier.id);
  }

  // Preenche descrição apenas se estiver vazia (não sobrescreve o que o usuário digitou)
  function suggestDescription(text: string) {
    if (!text) return;
    setDescription((cur) => cur || text.slice(0, 100));
  }

  function handleBarcodeResult(data: BarcodeData) {
    const nameParts = [data.name, data.brand, data.quantity].filter(Boolean).join(" ").trim();
    if (nameParts) setName((cur) => cur || nameParts.toUpperCase().slice(0, 60));

    const descParts = [data.category, data.quantity].filter(Boolean).join(" · ").trim();
    suggestDescription(descParts);

    // Sugere unidade pela quantidade, sem sobrescrever escolha manual (default "UN")
    if (data.quantity) {
      setUnit((cur) => (cur === "UN" ? unitFromQuantity(data.quantity) : cur));
    }
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Código de barras — primeiro campo (autocomplete EAN) */}
        <BarcodeField
          defaultValue={product?.barcode ?? ""}
          error={fieldErrors?.barcode?.[0]}
          onResult={handleBarcodeResult}
        />

        {/* SKU */}
        <Field
          label="SKU"
          name="sku"
          required
          defaultValue={product?.sku}
          error={fieldErrors?.sku?.[0]}
          placeholder="EX: PROD-001"
          onChange={(e) => {
            e.target.value = e.target.value
              .toUpperCase()
              .replace(/[^A-Z0-9\-]/g, "")
              .slice(0, 20);
          }}
        />

        {/* NCM com autocomplete + validação */}
        <NcmAutocompleteField
          defaultValue={product?.ncm}
          error={fieldErrors?.ncm?.[0]}
          onPickDescription={suggestDescription}
        />

        {/* Nome (controlado) */}
        <Field
          label="Nome"
          name="name"
          required
          value={name}
          error={fieldErrors?.name?.[0]}
          placeholder="NOME DO PRODUTO"
          onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 60))}
        />

        {/* Descrição (controlada) */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">
            Descrição <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 100))}
            placeholder="Descrição do produto (máx. 100 caracteres)"
            maxLength={100}
          />
          {fieldErrors?.description && (
            <p className="text-sm text-red-600">{fieldErrors.description[0]}</p>
          )}
        </div>

        {/* Unidade (autopreenchida pela quantidade do EAN) */}
        <div className="space-y-2">
          <Label htmlFor="unit">Unidade</Label>
          <Select name="unit" value={unit} onValueChange={(v) => setUnit(v as ProductUnit)}>
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

        {/* Localização */}
        <Field
          label="Localização física"
          name="location"
          defaultValue={product?.location ?? ""}
          error={fieldErrors?.location?.[0]}
          placeholder="EX: PRATELEIRA 3"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase().slice(0, 40);
          }}
        />

        {/* Fornecedor */}
        <div className="space-y-2">
          <Label htmlFor="supplierId">
            Fornecedor <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-2">
            <Select
              name="supplierId"
              value={selectedSupplierId}
              onValueChange={setSelectedSupplierId}
              required
            >
              <SelectTrigger id="supplierId" className="flex-1">
                <SelectValue placeholder="Selecione um fornecedor" />
              </SelectTrigger>
              <SelectContent>
                {supplierList.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setQuickModalOpen(true)}
            >
              + Novo
            </Button>
          </div>
          {fieldErrors?.supplierId && (
            <p className="text-sm text-red-600">{fieldErrors.supplierId[0]}</p>
          )}
        </div>

        {/* Classificações encadeadas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Departamento</Label>
            {departments.length === 0 && (
              <a
                href="../../settings/classifications"
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Cadastrar classificações
              </a>
            )}
          </div>
          <Select
            value={selectedDeptId}
            onValueChange={(v) => {
              setSelectedDeptId(v);
              setSelectedCatId("");
              setSelectedBrandId("");
            }}
            disabled={departments.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={departments.length === 0 ? "Nenhum departamento cadastrado" : "Nenhum"}
              />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select
            value={selectedCatId}
            onValueChange={(v) => {
              setSelectedCatId(v);
              setSelectedBrandId("");
            }}
            disabled={!selectedDeptId || categories.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !selectedDeptId
                    ? "Selecione um departamento"
                    : categories.length === 0
                      ? "Sem categorias neste depto"
                      : "Nenhuma"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Marca</Label>
          <Select
            value={selectedBrandId}
            onValueChange={setSelectedBrandId}
            disabled={!selectedCatId || brands.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !selectedCatId
                    ? "Selecione uma categoria"
                    : brands.length === 0
                      ? "Sem marcas nesta categoria"
                      : "Nenhuma"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* classificationId hidden */}
        <input type="hidden" name="classificationId" value={classificationId} />

        {/* Estoque mínimo */}
        <Field
          label="Estoque mínimo"
          name="minStock"
          type="number"
          step="1"
          defaultValue={String(product?.min_stock ?? 0)}
          error={fieldErrors?.minStock?.[0]}
        />

        {/* Preço de custo */}
        <div className="space-y-2">
          <Label htmlFor="costPrice-display">Preço de custo (R$)</Label>
          <Input
            id="costPrice-display"
            inputMode="decimal"
            value={costPriceInput.displayValue}
            onChange={costPriceInput.handleChange}
            onBlur={costPriceInput.handleBlur}
            placeholder="0,00"
            aria-invalid={!!fieldErrors?.costPrice}
          />
          <input type="hidden" name="costPrice" value={costPriceInput.decimalValue} />
          {fieldErrors?.costPrice && (
            <p className="text-sm text-red-600">{fieldErrors.costPrice[0]}</p>
          )}
        </div>

        {/* Preço de venda */}
        <div className="space-y-2">
          <Label htmlFor="salePrice-display">Preço de venda (R$)</Label>
          <Input
            id="salePrice-display"
            inputMode="decimal"
            value={salePriceInput.displayValue}
            onChange={salePriceInput.handleChange}
            onBlur={salePriceInput.handleBlur}
            placeholder="0,00"
            aria-invalid={!!fieldErrors?.salePrice}
          />
          <input type="hidden" name="salePrice" value={salePriceInput.decimalValue} />
          {fieldErrors?.salePrice && (
            <p className="text-sm text-red-600">{fieldErrors.salePrice[0]}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 md:col-span-2">
          <SubmitButton isEditing={!!product} />
        </div>
      </form>

      {QuickModal && (
        <QuickModal
          open={quickModalOpen}
          onOpenChange={setQuickModalOpen}
          onCreated={handleSupplierCreated}
        />
      )}
    </>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Aplica a máscara XXXX.XX.XX a partir dos dígitos digitados (máx. 8 dígitos). */
function formatNcm(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join(".");
}

function NcmAutocompleteField({
  defaultValue,
  error,
  onPickDescription,
}: {
  defaultValue?: string | null;
  error?: string;
  onPickDescription: (description: string) => void;
}) {
  const [value, setValue] = useState(() => formatNcm(defaultValue ?? ""));
  const [results, setResults] = useState<NcmItem[]>([]);
  const [open, setOpen] = useState(false);
  const [validity, setValidity] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guarda contra respostas obsoletas quando o usuário redigita o NCM
  const validationIdRef = useRef(0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = formatNcm(e.target.value);
    setValue(masked);
    const digits = masked.replace(/\D/g, "");
    const reqId = ++validationIdRef.current;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (digits.length < 2) {
      setResults([]);
      setOpen(false);
      setValidity("idle");
      return;
    }
    setValidity(digits.length === 8 ? "loading" : "idle");
    debounceRef.current = setTimeout(async () => {
      const items = await searchNcm(digits);
      if (reqId !== validationIdRef.current) return; // resposta obsoleta
      setResults(items);
      setOpen(items.length > 0);
      if (digits.length === 8) {
        const found = await lookupNcm(masked);
        if (reqId !== validationIdRef.current) return; // resposta obsoleta
        setValidity(found ? "valid" : "invalid");
      }
    }, 300);
  }

  function pick(item: NcmItem) {
    validationIdRef.current++;
    setValue(formatNcm(item.code));
    onPickDescription(item.description);
    setOpen(false);
    setResults([]);
    setValidity("valid");
  }

  return (
    <div className="relative space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="ncm">
          NCM <span className="text-red-500">*</span>
        </Label>
        {validity === "loading" && (
          <span className="text-xs text-muted-foreground">Validando...</span>
        )}
        {validity === "valid" && (
          <Badge variant="secondary" className="text-xs">
            NCM válido
          </Badge>
        )}
        {validity === "invalid" && (
          <Badge variant="destructive" className="text-xs">
            NCM não encontrado
          </Badge>
        )}
      </div>
      <Input
        id="ncm"
        name="ncm"
        required
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="0000.00.00"
        aria-invalid={!!error}
      />
      {open && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {results.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-mono text-xs">{item.code}</span>
                <span className="truncate text-xs text-muted-foreground">{item.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function BarcodeField({
  defaultValue,
  error,
  onResult,
}: {
  defaultValue: string;
  error?: string;
  onResult: (data: BarcodeData) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);
  const lookupIdRef = useRef(0);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
    setValue(digits);
    const reqId = ++lookupIdRef.current;
    if (digits.length !== 8 && digits.length !== 13) {
      setLoading(false); // invalida lookup pendente e some com o indicador
      return;
    }
    setLoading(true);
    const data = await lookupBarcode(digits);
    if (reqId !== lookupIdRef.current) return; // resposta obsoleta (usuário continuou digitando)
    setLoading(false);
    if (data) onResult(data);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="barcode">Código de barras (EAN)</Label>
        {loading && <span className="text-xs text-muted-foreground">Buscando produto...</span>}
      </div>
      <Input
        id="barcode"
        name="barcode"
        inputMode="numeric"
        value={value}
        onChange={handleChange}
        placeholder="EAN-8 ou EAN-13"
        aria-invalid={!!error}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  step?: string;
  value?: string;
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
  step,
  value,
  defaultValue,
  placeholder,
  onChange,
}: FieldProps) {
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
        step={step}
        required={required}
        value={controlled ? value : undefined}
        defaultValue={controlled ? undefined : defaultValue}
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
      {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar produto"}
    </Button>
  );
}
