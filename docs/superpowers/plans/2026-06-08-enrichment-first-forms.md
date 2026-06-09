# Forms enrichment-first (Fornecedores e Produtos) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar o contrato de resposta do `enrichment-services` (bug `isActive` + campos `cep`/`phone`/`email`/`quantity`) e refatorar os forms de Fornecedor e Produto para um fluxo enrichment-first (documento/EAN como primeiro campo, cascateando o autopreenchimento).

**Architecture:** Provider (Express) normaliza respostas de APIs externas e o ERP (Next.js) consome via Route Handlers de forma não-bloqueante (falha → `null` → preenchimento manual). Mudanças no provider são **aditivas** (campos novos, contrato retrocompatível). Nos forms, os campos autopreenchidos passam a estado controlado.

**Tech Stack:** TypeScript, Express, Vitest (provider) · Next.js 15 / React 19, Shadcn/UI, Vitest (ERP).

**Repos:** `enrichment-services` (provider) e `erp` (consumer) — ambos repos git independentes. Commits de cada fase vão no repo correspondente.

**Spec:** `erp/docs/superpowers/specs/2026-06-08-enrichment-first-forms-design.md`

---

## File Structure

**`enrichment-services`**

- `src/types.ts` — adiciona campos a `EmpresaResponse` e `BarcodeResponse`
- `src/routes/empresa/router.ts` — fix `isActive` + mapeia `cep`/`phone`/`email`
- `src/routes/barcode/router.ts` — mapeia `quantity`
- `src/__tests__/routes.test.ts` — atualiza casos existentes + novos

**`erp`**

- `src/lib/enrichment-client.ts` — campos novos em `EmpresaData`/`BarcodeData` + `lookupNcm`
- `src/modules/inventory/services/quantity-parser.ts` — **novo** util puro `unitFromQuantity`
- `src/modules/inventory/services/__tests__/quantity-parser.test.ts` — **novo**
- `src/modules/suppliers/components/supplier-form.tsx` — reorder + autofill + controlados
- `src/modules/inventory/components/product-form.tsx` — reorder + autofill + heurística + validação NCM

---

# FASE 1 — Provider (`enrichment-services`)

> Diretório de trabalho: `enrichment-services/`. Rodar testes: `npm test`.

## Task 1: Empresa — fix `isActive` + campos `cep`/`phone`/`email`

**Files:**

- Modify: `src/types.ts`
- Modify: `src/routes/empresa/router.ts:12-22` (função `buildEmpresaResponse`)
- Test: `src/__tests__/routes.test.ts:54-65`

- [ ] **Step 1: Atualizar os testes de `buildEmpresaResponse` (falha esperada)**

Substituir o bloco `describe("buildEmpresaResponse", ...)` (linhas 54-65) por:

```ts
describe("buildEmpresaResponse", () => {
  it("normaliza payload da BrasilAPI", () => {
    expect(
      buildEmpresaResponse({
        cnpj: "12345678000195",
        razao_social: "EMPRESA LTDA",
        nome_fantasia: "Empresa",
        municipio: "São Paulo",
        uf: "SP",
        descricao_situacao_cadastral: "ATIVA",
        cep: "01310-100",
        ddd_telefone_1: "(11) 2385-1939",
        email: "contato@empresa.com",
      }),
    ).toEqual({
      cnpj: "12345678000195",
      name: "EMPRESA LTDA",
      tradeName: "Empresa",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      isActive: true,
      cep: "01310100",
      phone: "1123851939",
      email: "contato@empresa.com",
    });
  });

  it("marca inativa quando descrição da situação não é ATIVA", () => {
    expect(buildEmpresaResponse({ descricao_situacao_cadastral: "BAIXADA" }).isActive).toBe(false);
  });

  it("email vazio quando upstream devolve null", () => {
    expect(buildEmpresaResponse({ email: null }).email).toBe("");
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/__tests__/routes.test.ts -t buildEmpresaResponse`
Expected: FAIL (objeto não tem `cep`/`phone`/`email`; `isActive` ainda lê `situacao_cadastral`).

- [ ] **Step 3: Estender `EmpresaResponse` em `src/types.ts`**

Substituir o type `EmpresaResponse` (linhas 4-7) por:

```ts
export type EmpresaResponse = {
  cnpj: string;
  name: string;
  tradeName: string;
  city: string;
  state: string;
  country: string;
  isActive: boolean;
  cep: string;
  phone: string;
  email: string;
};
```

- [ ] **Step 4: Corrigir `buildEmpresaResponse` em `src/routes/empresa/router.ts`**

Substituir a função `buildEmpresaResponse` (linhas 12-22) por:

```ts
export function buildEmpresaResponse(p: Record<string, unknown>): EmpresaResponse {
  return {
    cnpj: String(p.cnpj ?? ""),
    name: String(p.razao_social ?? ""),
    tradeName: String(p.nome_fantasia ?? ""),
    city: String(p.municipio ?? ""),
    state: String(p.uf ?? ""),
    country: "Brasil",
    isActive: String(p.descricao_situacao_cadastral ?? "").toUpperCase() === "ATIVA",
    cep: String(p.cep ?? "").replace(/\D/g, ""),
    phone: String(p.ddd_telefone_1 ?? "").replace(/\D/g, ""),
    email: p.email == null ? "" : String(p.email),
  };
}
```

- [ ] **Step 5: Rodar para ver passar**

Run: `npx vitest run src/__tests__/routes.test.ts -t buildEmpresaResponse`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/routes/empresa/router.ts src/__tests__/routes.test.ts
git commit -m "fix(empresa): isActive via descricao_situacao_cadastral + expoe cep/phone/email"
```

## Task 2: Barcode — campo `quantity`

**Files:**

- Modify: `src/types.ts`
- Modify: `src/routes/barcode/router.ts:12-24` (função `buildBarcodeResponse`)
- Test: `src/__tests__/routes.test.ts:88-99`

- [ ] **Step 1: Atualizar os testes de `buildBarcodeResponse` (falha esperada)**

Substituir o bloco `describe("buildBarcodeResponse", ...)` (linhas 88-99) por:

```ts
describe("buildBarcodeResponse", () => {
  it("normaliza payload do Open Food Facts", () => {
    expect(
      buildBarcodeResponse("7891234567890", {
        status: 1,
        product: {
          product_name: "Biscoito",
          brands: "Marca X",
          categories: "Biscoitos",
          quantity: "395 g",
        },
      }),
    ).toEqual({
      ean: "7891234567890",
      name: "Biscoito",
      brand: "Marca X",
      category: "Biscoitos",
      quantity: "395 g",
    });
  });

  it("quantity vazia quando ausente", () => {
    expect(buildBarcodeResponse("7891234567890", { status: 1, product: {} })!.quantity).toBe("");
  });

  it("retorna null quando status é 0", () => {
    expect(buildBarcodeResponse("7891234567890", { status: 0, product: {} })).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/__tests__/routes.test.ts -t buildBarcodeResponse`
Expected: FAIL (objeto não tem `quantity`).

- [ ] **Step 3: Estender `BarcodeResponse` em `src/types.ts`**

Substituir o type `BarcodeResponse` (linhas 13-15) por:

```ts
export type BarcodeResponse = {
  ean: string;
  name: string;
  brand: string;
  category: string;
  quantity: string;
};
```

- [ ] **Step 4: Mapear `quantity` em `src/routes/barcode/router.ts`**

Substituir a função `buildBarcodeResponse` (linhas 12-24) por:

```ts
export function buildBarcodeResponse(
  ean: string,
  payload: { status: number; product: Record<string, unknown> },
): BarcodeResponse | null {
  if (payload.status !== 1) return null;
  const p = payload.product;
  return {
    ean,
    name: String(p.product_name ?? ""),
    brand: String(p.brands ?? ""),
    category: String(p.categories ?? ""),
    quantity: String(p.quantity ?? ""),
  };
}
```

- [ ] **Step 5: Rodar a suíte inteira do provider**

Run: `npm test`
Expected: PASS (todos os testes, incl. os 3 de barcode).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/routes/barcode/router.ts src/__tests__/routes.test.ts
git commit -m "feat(barcode): expoe quantity no BarcodeResponse"
```

---

# FASE 2 — Consumer: Fornecedores (`erp`)

> Diretório de trabalho: `erp/`. Verificação: `npm run typecheck` e `npm run lint`.

## Task 3: Client — campos novos em `EmpresaData`

**Files:**

- Modify: `src/lib/enrichment-client.ts:12-20`

- [ ] **Step 1: Estender `EmpresaData`**

Substituir o type `EmpresaData` (linhas 12-20) por:

```ts
export type EmpresaData = {
  cnpj: string;
  name: string;
  tradeName: string;
  city: string;
  state: string;
  country: string;
  isActive: boolean;
  cep: string;
  phone: string;
  email: string;
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS (sem erros novos).

- [ ] **Step 3: Commit**

```bash
git add src/lib/enrichment-client.ts
git commit -m "feat(enrichment-client): cep/phone/email em EmpresaData"
```

## Task 4: Form de Fornecedor — reorder + autofill (CNPJ-first)

**Files:**

- Modify: `src/modules/suppliers/components/supplier-form.tsx`

> Esta tarefa toca várias regiões do mesmo arquivo. Aplicar os steps em ordem; cada step traz o código completo da região.

- [ ] **Step 1: Adicionar estado controlado para cep/email/telefone**

Substituir o bloco de estado (linhas 76-86, dos comentários "Campos controlados" até `const isBrazil = ...`) por:

```ts
// Campos controlados (autocomplete CNPJ/CEP preenche estes)
const [country, setCountry] = useState(supplier?.country ?? "Brasil");
const [name, setName] = useState(supplier?.name ?? "");
const [stateUf, setStateUf] = useState(supplier?.state ?? "");
const [city, setCity] = useState(supplier?.city ?? "");
const [cep, setCep] = useState(supplier?.cep ?? "");
const [email, setEmail] = useState(supplier?.email ?? "");
const initPhone = splitPhone(supplier?.phone ?? "");
const [ddi, setDdi] = useState(initPhone.ddi);
const [phoneNumber, setPhoneNumber] = useState(initPhone.number);

// Status da consulta de CNPJ (situação cadastral)
const [cnpjActive, setCnpjActive] = useState<boolean | null>(null);
const [cnpjLoading, setCnpjLoading] = useState(false);

const isBrazil = country === "Brasil";
```

- [ ] **Step 2: Resetar os novos campos após cadastro**

Substituir o bloco de reset dentro do `useEffect` (linhas 94-100, o `if (!supplier) { ... }`) por:

```ts
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
```

- [ ] **Step 3: Reescrever os handlers de CNPJ e CEP**

Substituir as funções `handleCnpjComplete` e `handleCepComplete` (linhas 107-127) por:

```ts
async function handleCnpjComplete(digits: string) {
  setCnpjLoading(true);
  setCnpjActive(null);
  const data = await lookupEmpresa(digits);
  setCnpjLoading(false);
  if (!data) return;

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
}

async function handleCepComplete(digits: string) {
  const data = await lookupCep(digits);
  if (data) {
    if (data.city) setCity(data.city);
    if (data.state) setStateUf(data.state);
    setCountry("Brasil");
  }
}
```

- [ ] **Step 4: Reordenar o JSX do form (CNPJ primeiro) + campos controlados**

Substituir todo o conteúdo do `<form>` (linhas 130-203, de `<form ref={formRef}...` até `</form>`) por:

```tsx
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
```

- [ ] **Step 5: Tornar `CepField` controlado**

Substituir todo o componente `CepField` (linhas 272-301) por:

```tsx
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
```

- [ ] **Step 6: Tornar `PhoneField` controlado**

Substituir todo o componente `PhoneField` (linhas 417-468) por:

```tsx
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
```

> Nota: `splitPhone`, `formatBrPhone` e `formatCep` continuam definidos no arquivo e agora são usados pelo componente pai. Não remover.

- [ ] **Step 7: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS (sem erros). Em particular, nenhum aviso de variável não usada para `splitPhone`/`formatBrPhone`.

- [ ] **Step 8: Verificação manual (dev server)**

Run: `npm run dev`, abrir o cadastro de fornecedor. Digitar um CNPJ válido (ex. `19131243000197`) e confirmar: Nome, Telefone, E-mail e CEP preenchidos; Cidade/Estado vindos do ViaCEP; badge de situação. Editar manualmente um campo deve continuar funcionando.

- [ ] **Step 9: Commit**

```bash
git add src/modules/suppliers/components/supplier-form.tsx
git commit -m "feat(suppliers): form CNPJ-first com autofill de nome/telefone/email/cep"
```

---

# FASE 3 — Consumer: Produtos (`erp`)

## Task 5: Client — `quantity` em `BarcodeData` + `lookupNcm`

**Files:**

- Modify: `src/lib/enrichment-client.ts:22` (type `BarcodeData`)
- Modify: `src/lib/enrichment-client.ts:42-45` (após `searchNcm`)

- [ ] **Step 1: Estender `BarcodeData`**

Substituir a linha do type `BarcodeData` (linha 22) por:

```ts
export type BarcodeData = {
  ean: string;
  name: string;
  brand: string;
  category: string;
  quantity: string;
};
```

- [ ] **Step 2: Adicionar `lookupNcm` (validação por código)**

Logo após a função `searchNcm` (linha 45), adicionar:

```ts
export function lookupNcm(codigo: string): Promise<NcmItem | null> {
  return getJson<NcmItem>(`/api/enrich/ncm?codigo=${encodeURIComponent(codigo)}`);
}
```

> O Route Handler `/api/enrich/ncm` já suporta o branch `?codigo=` chamando `/ncm/:codigo` no provider, que devolve `404` (→ `null`) para código inexistente. `codigo` deve ir **com pontos** (ex. `0901.21.00`), pois `getByCode` compara o código formatado.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/enrichment-client.ts
git commit -m "feat(enrichment-client): quantity em BarcodeData + lookupNcm"
```

## Task 6: Util `unitFromQuantity` (heurística de unidade)

**Files:**

- Create: `src/modules/inventory/services/quantity-parser.ts`
- Test: `src/modules/inventory/services/__tests__/quantity-parser.test.ts`

- [ ] **Step 1: Escrever os testes (falha esperada)**

Criar `src/modules/inventory/services/__tests__/quantity-parser.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { unitFromQuantity } from "../quantity-parser";

describe("unitFromQuantity", () => {
  it("gramas → KG", () => expect(unitFromQuantity("395 g")).toBe("KG"));
  it("quilos → KG", () => expect(unitFromQuantity("1 kg")).toBe("KG"));
  it("litros → L", () => expect(unitFromQuantity("1 L")).toBe("L"));
  it("mililitros → L", () => expect(unitFromQuantity("500 ml")).toBe("L"));
  it("multipack → CX", () => expect(unitFromQuantity("6 x 1 L")).toBe("CX"));
  it("vazio → UN", () => expect(unitFromQuantity("")).toBe("UN"));
  it("desconhecido → UN", () => expect(unitFromQuantity("12 unidades")).toBe("UN"));
});
```

- [ ] **Step 2: Rodar para ver falhar**

Run: `npx vitest run src/modules/inventory/services/__tests__/quantity-parser.test.ts`
Expected: FAIL (módulo `../quantity-parser` não existe).

- [ ] **Step 3: Implementar o util**

Criar `src/modules/inventory/services/quantity-parser.ts`:

```ts
export type ProductUnit = "UN" | "KG" | "L" | "CX" | "M";

/**
 * Deriva a unidade (UN/KG/L/CX/M) a partir do campo `quantity` do Open Food Facts
 * ("395 g", "1 L", "500 ml", "6 x 1 L"). Avaliação ordenada: a primeira regra que
 * casar vence, porque um multipack ("6 x 1 L") casaria também com litro.
 */
export function unitFromQuantity(quantity: string): ProductUnit {
  const q = quantity.toLowerCase().trim();
  if (!q) return "UN";
  if (/\d\s*x\s*\d/.test(q)) return "CX"; // multipack
  if (/(kg|g)\b/.test(q)) return "KG";
  if (/(ml|l)\b/.test(q)) return "L";
  return "UN";
}
```

- [ ] **Step 4: Rodar para ver passar**

Run: `npx vitest run src/modules/inventory/services/__tests__/quantity-parser.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add src/modules/inventory/services/quantity-parser.ts src/modules/inventory/services/__tests__/quantity-parser.test.ts
git commit -m "feat(inventory): util unitFromQuantity (heuristica de unidade por quantity)"
```

## Task 7: Form de Produto — reorder + autofill (EAN-first) + validação NCM

**Files:**

- Modify: `src/modules/inventory/components/product-form.tsx`

- [ ] **Step 1: Atualizar imports**

Substituir a linha de import do enrichment-client (linha 19) por:

```ts
import {
  searchNcm,
  lookupBarcode,
  lookupNcm,
  type NcmItem,
  type BarcodeData,
} from "@/lib/enrichment-client";
import { Badge } from "@/components/ui/badge";
import { unitFromQuantity, type ProductUnit } from "../services/quantity-parser";
```

- [ ] **Step 2: Adicionar estado controlado de unidade**

Logo após a linha `const [description, setDescription] = useState(product?.description ?? "");` (linha 59), adicionar:

```ts
const [unit, setUnit] = useState<ProductUnit>((product?.unit as ProductUnit) ?? "UN");
```

- [ ] **Step 3: Resetar unidade após cadastro**

Substituir o bloco `if (!product) { ... }` dentro do `useEffect` (linhas 117-121) por:

```ts
if (!product) {
  formRef.current?.reset();
  setName("");
  setDescription("");
  setUnit("UN");
}
```

- [ ] **Step 4: Reescrever `handleBarcodeResult` (nome+marca+quantidade, descrição, unidade)**

Substituir a função `handleBarcodeResult` (linhas 139-145) por:

```ts
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
```

- [ ] **Step 5: Reordenar o topo do form (Código de barras primeiro)**

Substituir o bloco que vai do comentário `{/* SKU */}` até o fim do bloco `{/* Barcode com autocomplete */}` (linhas 150-189) por:

```tsx
{
  /* Código de barras — primeiro campo (autocomplete EAN) */
}
<BarcodeField
  defaultValue={product?.barcode ?? ""}
  error={fieldErrors?.barcode?.[0]}
  onResult={handleBarcodeResult}
/>;

{
  /* SKU */
}
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
/>;

{
  /* NCM com autocomplete + validação */
}
<NcmAutocompleteField
  defaultValue={product?.ncm}
  error={fieldErrors?.ncm?.[0]}
  onPickDescription={suggestDescription}
/>;

{
  /* Nome (controlado) */
}
<Field
  label="Nome"
  name="name"
  required
  value={name}
  error={fieldErrors?.name?.[0]}
  placeholder="NOME DO PRODUTO"
  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 60))}
/>;
```

- [ ] **Step 6: Tornar o Select de Unidade controlado**

Substituir o bloco `{/* Unidade */}` (linhas 211-226) por:

```tsx
{
  /* Unidade (autopreenchida pela quantidade do EAN) */
}
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
</div>;
```

- [ ] **Step 7: `BarcodeField` passa o `BarcodeData` completo**

Substituir todo o componente `BarcodeField` (linhas 524-565) por:

```tsx
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

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 13);
    setValue(digits);
    if (digits.length === 8 || digits.length === 13) {
      setLoading(true);
      const data = await lookupBarcode(digits);
      setLoading(false);
      if (data) onResult(data);
    }
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
```

- [ ] **Step 8: `NcmAutocompleteField` com validação via `lookupNcm` + badge**

Substituir todo o componente `NcmAutocompleteField` (linhas 446-522) por:

```tsx
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = formatNcm(e.target.value);
    setValue(masked);
    const digits = masked.replace(/\D/g, "");
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
      setResults(items);
      setOpen(items.length > 0);
      if (digits.length === 8) {
        const found = await lookupNcm(masked);
        setValidity(found ? "valid" : "invalid");
      }
    }, 300);
  }

  function pick(item: NcmItem) {
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
```

> O badge é apenas informativo — **não bloqueia o submit** (serviço pode estar offline).

- [ ] **Step 9: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 10: Rodar a suíte de testes do ERP**

Run: `npm test`
Expected: PASS (incl. `quantity-parser` e os testes de actions inalterados).

- [ ] **Step 11: Verificação manual (dev server)**

Run: `npm run dev`, abrir cadastro de produto. Digitar um EAN válido (ex. `7891000100103`): Nome = produto+marca+quantidade, Descrição = categoria · quantidade, Unidade sugerida. Digitar um NCM completo válido (ex. `8517.12.31`) → badge "NCM válido"; um inexistente (ex. `9999.99.99`) → "NCM não encontrado", sem bloquear o save.

- [ ] **Step 12: Commit**

```bash
git add src/modules/inventory/components/product-form.tsx
git commit -m "feat(inventory): form EAN-first com autofill e validacao de NCM"
```

---

## Verificação final

- [ ] Provider: `cd enrichment-services && npm test` → tudo verde.
- [ ] ERP: `cd erp && npm run typecheck && npm run lint && npm test` → tudo verde.
- [ ] Smoke manual dos dois forms conforme steps 8 (Fornecedor) e 11 (Produto).

## Não-objetivos (não implementar neste plano)

- `street`/`neighborhood`/`logradouro`/`bairro` (sem coluna em `suppliers`).
- `image_url`/`nutriscore`/`category→classificação` do OFF.
- Descrição hierárquica de NCM (concatenar níveis pais).
- Corrigir a busca de NCM por prefixo de código no provider (`search` usa `startsWith` no código com pontos; hoje só casa por descrição) — pré-existente e fora do escopo destas pendências.
