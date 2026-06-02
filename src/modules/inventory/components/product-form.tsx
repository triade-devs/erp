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
import { SupplierQuickModal } from "@/modules/suppliers";
import type { Product } from "../types";
import type { ActionResult } from "@/lib/errors";
import type { Classification } from "../queries/list-classifications";
import type { Supplier } from "@/modules/suppliers";

const UNITS = ["UN", "KG", "L", "CX", "M"] as const;
const initial: ActionResult = { ok: false };

type Props = {
  product?: Product;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  suppliers?: { id: string; name: string }[];
  classifications?: Classification[];
};

export function ProductForm({
  product,
  updateAction,
  suppliers = [],
  classifications = [],
}: Props) {
  const action = updateAction ?? createProductAction;
  const [state, formAction] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

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
      if (!product) formRef.current?.reset();
      toast.success(state.message ?? "Salvo com sucesso.");
      return;
    }
    if (state.message) toast.error(state.message);
  }, [state]);

  function handleSupplierCreated(newSupplier: Supplier) {
    setSupplierList((prev) => [...prev, { id: newSupplier.id, name: newSupplier.name }]);
    setSelectedSupplierId(newSupplier.id);
  }

  return (
    <>
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        {/* NCM */}
        <NcmField defaultValue={product?.ncm} error={fieldErrors?.ncm?.[0]} />

        {/* Nome */}
        <Field
          label="Nome"
          name="name"
          required
          defaultValue={product?.name}
          error={fieldErrors?.name?.[0]}
          placeholder="NOME DO PRODUTO"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase().slice(0, 60);
          }}
        />

        {/* Barcode */}
        <Field
          label="Código de barras (EAN)"
          name="barcode"
          defaultValue={product?.barcode ?? ""}
          error={fieldErrors?.barcode?.[0]}
          placeholder="EAN-8 ou EAN-13"
          onChange={(e) => {
            e.target.value = e.target.value.replace(/\D/g, "").slice(0, 13);
          }}
        />

        {/* Descrição */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="description">
            Descrição <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            name="description"
            rows={2}
            required
            defaultValue={product?.description ?? ""}
            placeholder="Descrição do produto (máx. 100 caracteres)"
            maxLength={100}
          />
          {fieldErrors?.description && (
            <p className="text-sm text-red-600">{fieldErrors.description[0]}</p>
          )}
        </div>

        {/* Unidade */}
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
          <Label>Departamento</Label>
          <Select
            value={selectedDeptId}
            onValueChange={(v) => {
              setSelectedDeptId(v);
              setSelectedCatId("");
              setSelectedBrandId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Nenhum" />
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

        {selectedDeptId && (
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select
              value={selectedCatId}
              onValueChange={(v) => {
                setSelectedCatId(v);
                setSelectedBrandId("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
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
        )}

        {selectedCatId && (
          <div className="space-y-2">
            <Label>Marca</Label>
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma" />
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
        )}

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

      <SupplierQuickModal
        open={quickModalOpen}
        onOpenChange={setQuickModalOpen}
        onCreated={handleSupplierCreated}
      />
    </>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Aplica a máscara XXXX.XX.XX a partir dos dígitos digitados (máx. 8 dígitos). */
function formatNcm(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join(".");
}

function NcmField({ defaultValue, error }: { defaultValue?: string | null; error?: string }) {
  const [value, setValue] = useState(() => formatNcm(defaultValue ?? ""));

  return (
    <div className="space-y-2">
      <Label htmlFor="ncm">
        NCM <span className="text-red-500">*</span>
      </Label>
      <Input
        id="ncm"
        name="ncm"
        required
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(formatNcm(e.target.value))}
        placeholder="0000.00.00"
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
        step={step}
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
      {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar produto"}
    </Button>
  );
}
