# Enriquecimento de Campos de Produtos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o spec `docs/superpowers/specs/2026-05-28-product-fields-enrichment-design.md` por completo: novo módulo `suppliers`, tabela `product_classifications`, novos campos em `products` (barcode, location, classification_id, supplier_id; ncm já feito), formatador de preço e validações.

**Architecture:** Segue os limites modulares do ERP (`src/modules/<domain>` com barrel). Autorização em duas camadas (Zod/`requirePermission` no TS + RLS no Postgres). Migrations idempotentes com data-fix antes de apertar constraints em tabelas com dados existentes. TDD com vitest.

**Tech Stack:** Next.js 15 (Server Actions), Supabase (Postgres + RLS), Zod, React 19, vitest.

**Decisões travadas (brainstorming):**

- `supplier_id` NOT NULL com **fornecedor default + backfill** por empresa.
- Ajustes de campos existentes via **migration com data-fix** (UPPERCASE/truncate/round/backfill) + Zod.
- **Plano único em fases**, respeitando dependências de FK (suppliers e classifications antes das colunas de products).
- Roles reais: `owner`, `manager`, `operator`. Helpers RLS: `has_permission(company_id, code)`, `user_company_ids()`, `is_platform_admin()`.

**Já entregue (Fase 0 — NCM):** coluna `products.ncm` (migration `20260601000025_products_ncm.sql`), Zod, máscara no form, persistência nas actions, types, testes. Não repetir.

---

## Mapa de arquivos

**Criar:**

- `src/lib/price-formatter.ts` — `formatPriceDisplay`, `parsePriceToDecimal`, hook `usePriceInput`
- `src/lib/__tests__/price-formatter.test.ts`
- `supabase/migrations/20260602000026_suppliers.sql` — tabela suppliers
- `supabase/migrations/20260602000027_suppliers_rls.sql` — RLS suppliers
- `supabase/migrations/20260602000028_suppliers_permissions.sql` — módulo + permissões + default supplier por empresa
- `supabase/migrations/20260602000029_product_classifications.sql` — tabela + integridade hierárquica + RLS
- `supabase/migrations/20260602000030_products_enrichment.sql` — colunas novas em products + data-fix + constraints
- `src/modules/suppliers/{index.ts,types/index.ts,schemas/index.ts}`
- `src/modules/suppliers/actions/{create-supplier,update-supplier,deactivate-supplier}.ts`
- `src/modules/suppliers/queries/{list-suppliers,get-supplier}.ts`
- `src/modules/suppliers/components/{supplier-form,supplier-table,supplier-quick-modal}.tsx`
- `src/modules/suppliers/actions/__tests__/suppliers-actions.test.ts`
- `src/app/(dashboard)/[companySlug]/suppliers/{page.tsx,new/page.tsx,[id]/page.tsx}`
- `src/modules/inventory/queries/list-classifications.ts`

**Modificar:**

- `src/types/database.types.ts` — tipos das novas tabelas/colunas (via `npm run db:types`)
- `src/core/navigation/menu.ts` — item "Fornecedores"
- `src/modules/inventory/schemas/index.ts` — productSchema enriquecido
- `src/modules/inventory/components/product-form.tsx` — campos novos + selects + price inputs
- `src/modules/inventory/actions/{create-product,update-product}.ts` — persistir campos novos
- `src/modules/inventory/queries/list-products.ts` — ordenação por classificação
- `src/modules/inventory/index.ts` — exportar `listClassifications`
- `src/modules/inventory/actions/__tests__/inventory-actions.test.ts` — fixture + casos novos

---

## Fase 1 — Formatador de preço (`src/lib/price-formatter.ts`)

Sem dependências. Funções puras primeiro (TDD), hook depois.

### Task 1: `formatPriceDisplay` e `parsePriceToDecimal`

**Files:**

- Create: `src/lib/__tests__/price-formatter.test.ts`
- Create: `src/lib/price-formatter.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// src/lib/__tests__/price-formatter.test.ts
import { describe, it, expect } from "vitest";
import { formatPriceDisplay, parsePriceToDecimal } from "../price-formatter";

describe("formatPriceDisplay", () => {
  it("inteiro sem separador vira X,00", () => {
    expect(formatPriceDisplay("15")).toBe("15,00");
  });
  it("milhar inteiro recebe ponto de milhar e ,00", () => {
    expect(formatPriceDisplay("1000")).toBe("1.000,00");
  });
  it("vírgula preserva centavos", () => {
    expect(formatPriceDisplay("15,01")).toBe("15,01");
  });
  it("ponto digitado é tratado como decimal", () => {
    expect(formatPriceDisplay("1500.50")).toBe("1.500,50");
  });
  it("string vazia vira 0,00", () => {
    expect(formatPriceDisplay("")).toBe("0,00");
  });
});

describe("parsePriceToDecimal", () => {
  it("converte exibição BR para decimal SQL", () => {
    expect(parsePriceToDecimal("1.000,00")).toBe("1000.00");
    expect(parsePriceToDecimal("15,01")).toBe("15.01");
    expect(parsePriceToDecimal("15,00")).toBe("15.00");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/__tests__/price-formatter.test.ts`
Expected: FAIL — `Cannot find module '../price-formatter'`.

- [ ] **Step 3: Implementação mínima**

```ts
// src/lib/price-formatter.ts
/**
 * Utilitário de formatação de preço (pt-BR).
 * Exibição: "1.000,00". Banco (decimal SQL): "1000.00".
 */

/** Normaliza qualquer entrada do usuário em centavos inteiros (number). */
function toCents(raw: string): number {
  if (!raw.trim()) return 0;
  // Aceita "1500.50" (ponto decimal) ou "1.500,50" (formato BR) ou "15"
  const cleaned = raw.replace(/\s/g, "");
  let normalized: string;
  if (cleaned.includes(",")) {
    // formato BR: pontos são milhar, vírgula é decimal
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // sem vírgula: ponto (se houver) é decimal
    normalized = cleaned;
  }
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** "1000.00" — decimal SQL a partir de qualquer entrada. */
export function parsePriceToDecimal(display: string): string {
  return (toCents(display) / 100).toFixed(2);
}

/** "1.000,00" — exibição BR a partir de qualquer entrada. */
export function formatPriceDisplay(raw: string): string {
  const decimal = (toCents(raw) / 100).toFixed(2); // "1000.00"
  const [intPart, centPart] = decimal.split(".");
  const withThousands = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${centPart}`;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/__tests__/price-formatter.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/price-formatter.ts src/lib/__tests__/price-formatter.test.ts
git commit -m "feat(lib): add price-formatter (pt-BR display/decimal)"
```

### Task 2: Hook `usePriceInput`

**Files:**

- Modify: `src/lib/price-formatter.ts`

- [ ] **Step 1: Adicionar o hook** (sem teste unitário de hook — é wrapper fino sobre funções já testadas; será exercitado no form)

```ts
// adicionar ao final de src/lib/price-formatter.ts
import { useState } from "react";

export function usePriceInput(initialValue?: string) {
  const [displayValue, setDisplayValue] = useState(() =>
    initialValue ? formatPriceDisplay(initialValue) : "",
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // durante a digitação, mantém o texto cru (não formata a cada tecla)
    setDisplayValue(e.target.value);
  }

  function handleBlur() {
    setDisplayValue((v) => (v.trim() ? formatPriceDisplay(v) : ""));
  }

  return {
    displayValue,
    handleChange,
    handleBlur,
    decimalValue: parsePriceToDecimal(displayValue),
  };
}
```

> Nota: `price-formatter.ts` passa a importar React; é client-safe (não usa `server-only`). As funções puras continuam utilizáveis no servidor.

- [ ] **Step 2: typecheck + commit**

Run: `npx tsc --noEmit` → Expected: No errors found.

```bash
git add src/lib/price-formatter.ts
git commit -m "feat(lib): add usePriceInput hook"
```

---

## Fase 2 — Módulo `suppliers`

Precisa existir antes de `products.supplier_id`. Espelha a estrutura de `inventory` e `knowledge-base`.

### Task 3: Migration da tabela `suppliers`

**Files:**

- Create: `supabase/migrations/20260602000026_suppliers.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- Tabela de fornecedores (multi-tenant)
create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,                       -- UPPERCASE, max 80 (Zod)
  document    text,                                -- CNPJ/CPF opcional
  phone       text,                                -- max 20 opcional
  email       text,                                -- email válido opcional
  is_active   boolean not null default true,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_suppliers_company on public.suppliers(company_id);
create index idx_suppliers_name on public.suppliers
  using gin (to_tsvector('portuguese', name));
```

- [ ] **Step 2: Commit** (migrations aplicadas em lote no final da fase)

```bash
git add supabase/migrations/20260602000026_suppliers.sql
git commit -m "feat(db): suppliers table"
```

### Task 4: RLS de `suppliers`

**Files:**

- Create: `supabase/migrations/20260602000027_suppliers_rls.sql`

- [ ] **Step 1: Escrever a migration** (padrão idêntico ao `products_rls`)

```sql
alter table public.suppliers enable row level security;

create policy "suppliers_select" on public.suppliers
  for select using (company_id in (select public.user_company_ids()));

create policy "suppliers_insert" on public.suppliers
  for insert with check (public.has_permission(company_id, 'suppliers:supplier:create'));

create policy "suppliers_update" on public.suppliers
  for update
  using (public.has_permission(company_id, 'suppliers:supplier:update'))
  with check (public.has_permission(company_id, 'suppliers:supplier:update'));

create policy "suppliers_delete" on public.suppliers
  for delete using (public.has_permission(company_id, 'suppliers:supplier:delete'));
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260602000027_suppliers_rls.sql
git commit -m "feat(db): suppliers RLS"
```

### Task 5: Módulo, permissões e fornecedor default

**Files:**

- Create: `supabase/migrations/20260602000028_suppliers_permissions.sql`

- [ ] **Step 1: Escrever a migration** (segue `kb_permissions.sql`; tabela `permissions` tem colunas code/module_code/resource/action/description)

```sql
-- Módulo declarativo
insert into public.modules (code, name, is_system, sort_order) values
  ('suppliers', 'Fornecedores', false, 20)
on conflict (code) do nothing;

-- Permissões atômicas
insert into public.permissions (code, module_code, resource, action, description) values
  ('suppliers:supplier:read',   'suppliers', 'supplier', 'read',   'Ver fornecedores'),
  ('suppliers:supplier:create', 'suppliers', 'supplier', 'create', 'Criar fornecedores'),
  ('suppliers:supplier:update', 'suppliers', 'supplier', 'update', 'Editar fornecedores'),
  ('suppliers:supplier:delete', 'suppliers', 'supplier', 'delete', 'Desativar fornecedores')
on conflict (code) do nothing;

-- Habilita módulo para todas as empresas existentes
insert into public.company_modules (company_id, module_code)
select id, 'suppliers' from public.companies
on conflict do nothing;

-- owner: todas
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r
cross join public.permissions p
where r.code = 'owner' and p.module_code = 'suppliers'
on conflict do nothing;

-- manager: read/create/update
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r
cross join public.permissions p
where r.code = 'manager'
  and p.code in ('suppliers:supplier:read','suppliers:supplier:create','suppliers:supplier:update')
on conflict do nothing;

-- operator: read
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r
cross join public.permissions p
where r.code = 'operator' and p.code = 'suppliers:supplier:read'
on conflict do nothing;

-- Fornecedor default por empresa (necessário para backfill de products.supplier_id)
insert into public.suppliers (company_id, name, is_active)
select id, 'FORNECEDOR NÃO INFORMADO', true from public.companies
on conflict do nothing;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260602000028_suppliers_permissions.sql
git commit -m "feat(db): suppliers module, permissions and default supplier"
```

### Task 6: Aplicar migrations e regenerar types

**Files:**

- Modify: `src/types/database.types.ts`

- [ ] **Step 1: Aplicar e regenerar**

Run:

```bash
npm run db:push
npm run db:types
```

Expected: `suppliers` aparece em `src/types/database.types.ts` (Row/Insert/Update).

- [ ] **Step 2: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore(db): regenerate types with suppliers"
```

### Task 7: Types e schema do módulo

**Files:**

- Create: `src/modules/suppliers/types/index.ts`
- Create: `src/modules/suppliers/schemas/index.ts`

- [ ] **Step 1: types** (derivar de Database — padrão `inventory/types`)

```ts
// src/modules/suppliers/types/index.ts
import type { Database } from "@/types/database.types";

export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type SupplierInsert = Database["public"]["Tables"]["suppliers"]["Insert"];
export type SupplierUpdate = Database["public"]["Tables"]["suppliers"]["Update"];

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

- [ ] **Step 2: schema** (validações do spec Seção 4)

```ts
// src/modules/suppliers/schemas/index.ts
import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  document: z.string().max(18, "Documento inválido").optional().nullable(),
  phone: z.string().max(20, "Máximo 20 caracteres").optional().nullable(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
```

- [ ] **Step 3: typecheck + commit**

Run: `npx tsc --noEmit` → Expected: No errors found.

```bash
git add src/modules/suppliers/types src/modules/suppliers/schemas
git commit -m "feat(suppliers): types and zod schema"
```

### Task 8: Actions (TDD espelhando `inventory-actions.test.ts`)

**Files:**

- Create: `src/modules/suppliers/actions/__tests__/suppliers-actions.test.ts`
- Create: `src/modules/suppliers/actions/create-supplier.ts`
- Create: `src/modules/suppliers/actions/update-supplier.ts`
- Create: `src/modules/suppliers/actions/deactivate-supplier.ts`

- [ ] **Step 1: Escrever o teste que falha** (copiar a infra de mocks de `inventory-actions.test.ts` — `vi.mock` de server-only/next-cache/supabase/tenancy/authz; `makeSupabaseMock`; `makeFormData`). Casos mínimos:

```ts
// trecho central — replicar setup de mocks do inventory test
const validSupplier = { name: "Fornecedor X", isActive: "true" };

describe("createSupplierAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloqueia sem empresa ativa", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(null);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    const r = await createSupplierAction({ ok: false }, makeFormData(validSupplier));
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(/empresa ativa/i);
  });

  it("nega quando sem permissão", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    vi.mocked(requirePermission).mockRejectedValue(new ForbiddenError("suppliers:supplier:create"));
    const r = await createSupplierAction({ ok: false }, makeFormData(validSupplier));
    expect(r.ok).toBe(false);
    expect((r as { message: string }).message).toMatch(/acesso negado/i);
  });

  it("chama requirePermission com o code correto", async () => {
    vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
    await createSupplierAction({ ok: false }, makeFormData(validSupplier));
    expect(requirePermission).toHaveBeenCalledWith(COMPANY_A, "suppliers:supplier:create");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/modules/suppliers/actions/__tests__/suppliers-actions.test.ts`
Expected: FAIL — módulos de action não existem.

- [ ] **Step 3: Implementar as actions** (espelhar exatamente `create-product.ts`/`update-product.ts`/`deactivate-product.ts`, trocando tabela `products`→`suppliers`, codes `inventory:product:*`→`suppliers:supplier:*`, e campos para `name/document/phone/email/is_active`). `create-supplier.ts` insere `{ name: parsed.data.name.toUpperCase(), document, phone, email: email||null, is_active, company_id, created_by }`. `deactivate-supplier.ts` assina `(companyId, id, prev, formData)` como `deactivate-product.ts`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/modules/suppliers/actions/__tests__/suppliers-actions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/suppliers/actions
git commit -m "feat(suppliers): create/update/deactivate actions (TDD)"
```

### Task 9: Queries

**Files:**

- Create: `src/modules/suppliers/queries/list-suppliers.ts`
- Create: `src/modules/suppliers/queries/get-supplier.ts`

- [ ] **Step 1: Implementar** (espelha `list-products.ts`/`get-product.ts`; `import "server-only"`). `listSuppliers(companyId, { onlyActive })` → `select("*").eq("company_id", companyId).order("name")`. `getSupplier(id, companyId)` → `select("*").eq("id").eq("company_id").single()`.

- [ ] **Step 2: typecheck + commit**

Run: `npx tsc --noEmit` → Expected: No errors found.

```bash
git add src/modules/suppliers/queries
git commit -m "feat(suppliers): list/get queries"
```

### Task 10: Componentes + barrel

**Files:**

- Create: `src/modules/suppliers/components/supplier-form.tsx`
- Create: `src/modules/suppliers/components/supplier-table.tsx`
- Create: `src/modules/suppliers/components/supplier-quick-modal.tsx`
- Create: `src/modules/suppliers/index.ts`

- [ ] **Step 1: `supplier-form.tsx`** — espelha `product-form.tsx` (useActionState, Field subcomponent, toast). Campos: Nome (required, UPPERCASE em tempo real via `onChange` → `toUpperCase()`), Documento, Telefone, E-mail. Segue o skill `erp-form-components`.

- [ ] **Step 2: `supplier-table.tsx`** — espelha `product-table.tsx`: colunas Nome, Documento, Telefone, E-mail, Status; botão desativar.

- [ ] **Step 3: `supplier-quick-modal.tsx`** — usa `@/components/ui/dialog`. Apenas **Nome** (obrigatório) e **Documento** (opcional). Ao salvar com sucesso (`createSupplierAction`), fecha e chama `onCreated(supplier)` para o form do produto selecionar o novo fornecedor. Aceita props `{ open, onOpenChange, onCreated }`.

- [ ] **Step 4: `index.ts`** (barrel — única API pública)

```ts
// src/modules/suppliers/index.ts
export { createSupplierAction } from "./actions/create-supplier";
export { updateSupplierAction } from "./actions/update-supplier";
export { deactivateSupplierAction } from "./actions/deactivate-supplier";
export { listSuppliers } from "./queries/list-suppliers";
export { getSupplier } from "./queries/get-supplier";
export type { Supplier, SupplierInsert, SupplierUpdate } from "./types";
export { supplierSchema, type SupplierInput } from "./schemas";
export { SupplierForm } from "./components/supplier-form";
export { SupplierTable } from "./components/supplier-table";
export { SupplierQuickModal } from "./components/supplier-quick-modal";
```

- [ ] **Step 5: typecheck + lint + commit**

Run: `npx tsc --noEmit && npx eslint src/modules/suppliers --ext .ts,.tsx` → Expected: sem erros.

```bash
git add src/modules/suppliers/components src/modules/suppliers/index.ts
git commit -m "feat(suppliers): form, table, quick-modal and barrel"
```

### Task 11: Rotas e menu

**Files:**

- Create: `src/app/(dashboard)/[companySlug]/suppliers/page.tsx`
- Create: `src/app/(dashboard)/[companySlug]/suppliers/new/page.tsx`
- Create: `src/app/(dashboard)/[companySlug]/suppliers/[id]/page.tsx`
- Modify: `src/core/navigation/menu.ts`

- [ ] **Step 1: Páginas** — espelham `inventory/page.tsx`, `inventory/new/page.tsx`, `inventory/[id]/page.tsx`. `page.tsx`: `getActiveCompanyId` + `listSuppliers` → `<SupplierTable>`. `new/page.tsx`: `<SupplierForm>`. `[id]/page.tsx`: `getSupplier` → `<SupplierForm supplier={...} updateAction={...}>`. Seguir skill `erp-module-registration`.

- [ ] **Step 2: Registrar no menu** — inserir após "Movimentações":

```ts
{
  label: "Fornecedores",
  href: "/suppliers",
  icon: "truck",
  group: "Estoque",
  requiresSlug: true,
  requiresPermission: "suppliers:supplier:read",
},
```

- [ ] **Step 3: build + commit**

Run: `npm run build` → Expected: sucesso.

```bash
git add "src/app/(dashboard)/[companySlug]/suppliers" src/core/navigation/menu.ts
git commit -m "feat(suppliers): routes and menu entry"
```

---

## Fase 3 — Classificações e colunas de products

### Task 12: Tabela `product_classifications` + integridade + RLS

**Files:**

- Create: `supabase/migrations/20260602000029_product_classifications.sql`

- [ ] **Step 1: Escrever a migration**

```sql
create table public.product_classifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,                       -- UPPERCASE max 60 (Zod)
  level       text not null check (level in ('department','category','brand')),
  parent_id   uuid references public.product_classifications(id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_classifications_company on public.product_classifications(company_id);
create index idx_classifications_parent on public.product_classifications(parent_id);

-- Integridade hierárquica: department->null, category->department, brand->category
create or replace function public.check_classification_hierarchy()
returns trigger language plpgsql as $$
declare
  parent_level text;
begin
  if new.level = 'department' then
    if new.parent_id is not null then
      raise exception 'department não pode ter parent';
    end if;
  else
    if new.parent_id is null then
      raise exception '% requer parent', new.level;
    end if;
    select level into parent_level from public.product_classifications where id = new.parent_id;
    if new.level = 'category' and parent_level <> 'department' then
      raise exception 'category deve apontar para department';
    end if;
    if new.level = 'brand' and parent_level <> 'category' then
      raise exception 'brand deve apontar para category';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_classification_hierarchy
  before insert or update on public.product_classifications
  for each row execute function public.check_classification_hierarchy();

-- RLS
alter table public.product_classifications enable row level security;

create policy "classifications_select" on public.product_classifications
  for select using (company_id in (select public.user_company_ids()));

create policy "classifications_insert" on public.product_classifications
  for insert with check (public.has_permission(company_id, 'inventory:product:update'));

create policy "classifications_update" on public.product_classifications
  for update using (public.has_permission(company_id, 'inventory:product:update'))
  with check (public.has_permission(company_id, 'inventory:product:update'));

create policy "classifications_delete" on public.product_classifications
  for delete using (public.has_permission(company_id, 'inventory:product:update'));
```

> Classificações reutilizam a permissão `inventory:product:update` (são configuração de catálogo; a UI de CRUD dedicada está fora do escopo do spec).

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20260602000029_product_classifications.sql
git commit -m "feat(db): product_classifications with hierarchy integrity and RLS"
```

### Task 13: Colunas novas em products + data-fix

**Files:**

- Create: `supabase/migrations/20260602000030_products_enrichment.sql`

- [ ] **Step 1: Escrever a migration** (data-fix ANTES de apertar constraints; supplier_id via default supplier)

```sql
-- 1. Novas colunas (nullable primeiro)
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists location text;
alter table public.products add column if not exists classification_id uuid
  references public.product_classifications(id) on delete set null;
alter table public.products add column if not exists supplier_id uuid
  references public.suppliers(id);

-- 2. Backfill supplier_id com o fornecedor default da empresa
update public.products p
set supplier_id = s.id
from public.suppliers s
where s.company_id = p.company_id
  and s.name = 'FORNECEDOR NÃO INFORMADO'
  and p.supplier_id is null;

alter table public.products alter column supplier_id set not null;

-- 3. Data-fix dos campos existentes antes de apertar limites
update public.products set name = upper(name);
update public.products set sku = left(sku, 20) where length(sku) > 20;
update public.products set description = '—' where description is null or btrim(description) = '';
update public.products set description = left(description, 100) where length(description) > 100;
update public.products set min_stock = round(min_stock);

-- 4. Apertar constraints
alter table public.products alter column description set not null;
alter table public.products add constraint products_sku_len_chk check (char_length(sku) <= 20);
alter table public.products add constraint products_name_len_chk check (char_length(name) <= 60);
alter table public.products add constraint products_desc_len_chk check (char_length(description) <= 100);
alter table public.products add constraint products_location_len_chk
  check (location is null or char_length(location) <= 40);
alter table public.products add constraint products_barcode_chk
  check (barcode is null or barcode ~ '^[0-9]{8}$' or barcode ~ '^[0-9]{13}$');
alter table public.products add constraint products_min_stock_int_chk
  check (min_stock = round(min_stock));

-- barcode unique por empresa
create unique index if not exists uq_products_company_barcode
  on public.products(company_id, barcode) where barcode is not null;
```

> Nota: `name` max 60 é constraint; o data-fix não trunca name (assume nomes ≤60). Se houver nomes >60 no banco, adicionar `update ... set name = left(name,60) where length(name)>60;` antes do constraint — incluir só se a verificação de dados acusar.

- [ ] **Step 2: Aplicar + regenerar types**

Run:

```bash
npm run db:push
npm run db:types
```

Expected: `products` ganha `barcode/location/classification_id/supplier_id`; `product_classifications` aparece nos types.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260602000030_products_enrichment.sql src/types/database.types.ts
git commit -m "feat(db): products enrichment columns with data-fix and constraints"
```

### Task 14: Query de classificações

**Files:**

- Create: `src/modules/inventory/queries/list-classifications.ts`
- Modify: `src/modules/inventory/index.ts`

- [ ] **Step 1: Implementar** (`import "server-only"`)

```ts
// src/modules/inventory/queries/list-classifications.ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type Classification = Database["public"]["Tables"]["product_classifications"]["Row"];

export async function listClassifications(
  companyId: string,
  level?: "department" | "category" | "brand",
  parentId?: string,
): Promise<Classification[]> {
  const supabase = await createClient();
  let q = supabase.from("product_classifications").select("*").eq("company_id", companyId);
  if (level) q = q.eq("level", level);
  if (parentId) q = q.eq("parent_id", parentId);
  const { data, error } = await q.order("sort_order").order("name");
  if (error) return [];
  return data;
}
```

- [ ] **Step 2: Exportar no barrel** — adicionar a `src/modules/inventory/index.ts`:

```ts
export { listClassifications, type Classification } from "./queries/list-classifications";
```

- [ ] **Step 3: typecheck + commit**

Run: `npx tsc --noEmit` → Expected: No errors found.

```bash
git add src/modules/inventory/queries/list-classifications.ts src/modules/inventory/index.ts
git commit -m "feat(inventory): list-classifications query"
```

---

## Fase 4 — Validação, schema e formulário de produto

### Task 15: productSchema enriquecido (TDD)

**Files:**

- Modify: `src/modules/inventory/schemas/index.ts`
- Modify: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`

- [ ] **Step 1: Atualizar `validProductData` e adicionar casos que falham** — incluir `supplierId` (uuid válido) no fixture e novos testes:

```ts
// no fixture validProductData, adicionar:
//   supplierId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
//   description: "Produto de teste",
// novo teste:
it("rejeita barcode fora de EAN-8/EAN-13", async () => {
  vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
  vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
  const r = await createProductAction(
    { ok: false },
    makeFormData({ ...validProductData, barcode: "123" }),
  );
  expect(r.ok).toBe(false);
  expect((r as { fieldErrors?: Record<string, string[]> }).fieldErrors?.barcode).toBeDefined();
  expect(requirePermission).not.toHaveBeenCalled();
});

it("rejeita produto sem fornecedor", async () => {
  vi.mocked(getActiveCompanyId).mockResolvedValue(COMPANY_A);
  vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
  const noSupplier = { ...validProductData };
  delete (noSupplier as Record<string, string>).supplierId;
  const r = await createProductAction({ ok: false }, makeFormData(noSupplier));
  expect(r.ok).toBe(false);
  expect(requirePermission).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
Expected: FAIL — schema atual não valida barcode nem exige supplierId.

- [ ] **Step 3: Atualizar `productSchema`** para o estado final do spec (mantendo `ncm` já existente):

```ts
export const productSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU obrigatório")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[A-Z0-9\-]+$/i, "SKU deve ser alfanumérico (letras, números e hífens)"),
  ncm: z
    .string()
    .min(1, "NCM obrigatório")
    .regex(/^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$/, "NCM deve estar no formato XXXX.XX.XX"),
  barcode: z
    .string()
    .regex(/^[0-9]{8}$|^[0-9]{13}$/, "Use EAN-8 ou EAN-13")
    .optional()
    .or(z.literal("")),
  name: z.string().min(2, "Mínimo 2 caracteres").max(60, "Máximo 60 caracteres"),
  description: z.string().min(1, "Descrição obrigatória").max(100, "Máximo 100 caracteres"),
  unit: z.enum(["UN", "KG", "L", "CX", "M"], { required_error: "Selecione a unidade" }),
  costPrice: z.coerce.number({ invalid_type_error: "Valor inválido" }).nonnegative("Deve ser >= 0"),
  salePrice: z.coerce.number({ invalid_type_error: "Valor inválido" }).nonnegative("Deve ser >= 0"),
  minStock: z.coerce
    .number({ invalid_type_error: "Valor inválido" })
    .int("Use um inteiro")
    .nonnegative("Deve ser >= 0")
    .default(0),
  supplierId: z.string().uuid("Selecione um fornecedor"),
  classificationId: z.string().uuid().optional().or(z.literal("")),
  location: z.string().max(40, "Máximo 40 caracteres").optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});
```

- [ ] **Step 4: Atualizar actions** — em `create-product.ts` e `update-product.ts`, adicionar ao insert/update:

```ts
barcode: parsed.data.barcode || null,
location: parsed.data.location ? parsed.data.location.toUpperCase() : null,
classification_id: parsed.data.classificationId || null,
supplier_id: parsed.data.supplierId,
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
Expected: PASS (todos).

- [ ] **Step 6: Commit**

```bash
git add src/modules/inventory/schemas/index.ts src/modules/inventory/actions/create-product.ts src/modules/inventory/actions/update-product.ts src/modules/inventory/actions/__tests__/inventory-actions.test.ts
git commit -m "feat(inventory): enriched productSchema + persist new fields (TDD)"
```

### Task 16: Formulário de produto enriquecido

**Files:**

- Modify: `src/modules/inventory/components/product-form.tsx`

- [ ] **Step 1: Receber dados auxiliares** — a página passará `suppliers` e `departments` como props. Atualizar `Props`:

```ts
type Props = {
  product?: Product;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  suppliers: { id: string; name: string }[];
  departments: { id: string; name: string }[];
};
```

- [ ] **Step 2: Adicionar campos** ao JSX, seguindo os subcomponentes existentes:
  - **Barcode**: `Field` controlado só-dígitos (`onChange` → `replace(/\D/g, "").slice(0,13)`).
  - **Localização**: `Field` UPPERCASE em tempo real.
  - **Fornecedor** (obrigatório): `Select name="supplierId"` populado por `suppliers`; botão "Novo fornecedor" abre `SupplierQuickModal` (importado de `@/modules/suppliers`); `onCreated` adiciona à lista local e seleciona.
  - **Classificações**: 3 `Select` encadeados (Departamento/Categoria/Marca). Departamento vem de `departments`. Ao escolher, buscar filhos via Server Action wrapper ou rota; **MVP**: carregar todos os níveis na página e filtrar client-side por `parent_id`. `classificationId` (hidden) = nível mais específico selecionado.
  - **Preços**: trocar inputs nativos por `usePriceInput` (`@/lib/price-formatter`); input visível mostra `displayValue` (com `onChange`/`onBlur`), `<input type="hidden" name="costPrice" value={decimalValue}>` e idem salePrice.
  - **Estoque mínimo**: `type="number" step="1"`.
  - **Nome**: UPPERCASE em tempo real.

- [ ] **Step 3: build + lint**

Run: `npm run build && npx eslint src/modules/inventory --ext .ts,.tsx` → Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/modules/inventory/components/product-form.tsx
git commit -m "feat(inventory): enriched product form (supplier, classifications, barcode, location, price inputs)"
```

### Task 17: Páginas de produto passam dados auxiliares + ordenação

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/inventory/new/page.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/inventory/[id]/page.tsx`
- Modify: `src/modules/inventory/queries/list-products.ts`

- [ ] **Step 1: Páginas** — buscar `listSuppliers(companyId, { onlyActive: true })` e `listClassifications(companyId, "department")` (e todos os níveis para os selects encadeados) e passar como props ao `<ProductForm>`.

- [ ] **Step 2: Ordenação** — em `list-products.ts`, quando houver filtro de classificação, ordenar por `classification_id`; sem filtro, manter `order("name")` atual. (Implementação mínima: aceitar `classificationId?` no input e aplicar `.eq("classification_id", ...)` + `.order("name")`.)

- [ ] **Step 3: build + commit**

Run: `npm run build` → Expected: sucesso.

```bash
git add "src/app/(dashboard)/[companySlug]/inventory" src/modules/inventory/queries/list-products.ts
git commit -m "feat(inventory): wire suppliers/classifications into product pages + ordering"
```

---

## Fase 5 — Verificação final

### Task 18: Suite completa + KB sync

- [ ] **Step 1: Rodar tudo**

Run:

```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
```

Expected: typecheck limpo, lint sem erros novos, todos os testes passam, build OK.

- [ ] **Step 2: Sincronizar documentação** — invocar skill `kb-maintainer` para detectar drift (novo módulo suppliers, novas permissões, novas tabelas) e atualizar `docs/flows/inventory.md` + KB.

- [ ] **Step 3: Atualizar status do spec** — marcar `docs/superpowers/specs/2026-05-28-product-fields-enrichment-design.md` como `Status: Implementado`.

- [ ] **Step 4: Commit final**

```bash
git add docs
git commit -m "docs: sync KB/flows and mark enrichment spec implemented"
```

---

## Notas de execução

- **RLS dupla**: cada migration de tabela acompanha policies; cada action chama `requirePermission`. Verificar que platform admin e usuários comuns funcionam (CLAUDE.md).
- **db:types**: rodar `npm run db:push && npm run db:types` após cada lote de migration (Tasks 6, 13). Exige Supabase linkado.
- **Quick modal**: depende de `@/components/ui/dialog` (Radix) — já instalado (`@radix-ui/react-dialog` no package.json).
- **Fora do escopo (spec)**: UI de CRUD de classificações em `/settings/classifications`; relatórios; import CSV; leitor de barras; integração externa de NCM/CNPJ/barcode (microserviços — spec própria, Node/TS).
