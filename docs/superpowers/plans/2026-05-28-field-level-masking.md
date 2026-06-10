# PR #H — Field-level (mascaramento) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar regras de mascaramento por campo (column-level) por role: cada coluna marcada em `field_catalog` pode ser `hidden`, `readonly` ou `editable` para uma role. Duas camadas: trigger BEFORE UPDATE em `products` (autoritativa, bloqueia escrita de coluna readonly/hidden) + máscara client-side (UX/perf). Inclui UI: aba "Campos" no role detail.

**Architecture:**

- 2 tabelas globais: `field_catalog` (catálogo de colunas mascaráveis) + `role_field_rules` (atribuições de modo por role/coluna).
- Helpers SQL: `user_field_mode(company, table, column)` e `visible_columns(company, table)`.
- Trigger `enforce_field_rules` (BEFORE UPDATE) em `products` — compara `to_jsonb(new)` vs `to_jsonb(old)` por coluna do catálogo e bloqueia com `P0403` se modo for `readonly`/`hidden`.
- `PermissionsProvider` ganha `fieldModes: Record<string, 'hidden'|'readonly'|'editable'>` (chave `table.column`).
- Hook `useFieldMode(table, column)` lê do contexto.
- Service `selectVisible<T>(table, companyId, baseQuery)` chama RPC `visible_columns` e monta SELECT.
- UI: aba "Campos" no role detail (`/settings/roles/[id]`) lista catálogo agrupado por módulo, com radio (hidden/readonly/editable) por coluna.
- Form de produto: `cost_price` e `sale_price` se ajustam ao `useFieldMode`.

**Tech Stack:** Supabase Postgres · plpgsql · RLS · TS Server Actions · React 19 · Shadcn · Vitest.

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção "Fase 4".

**Depende de:** PRs #A–#G (`feat/roles-evolution`).

**Não inclui:**

- Triggers `enforce_field_rules` em tabelas além de `products` — adicionar conforme demanda (`movements`, `kb_articles`, etc.).
- Field rules em CREATE (apenas UPDATE nesta PR; create-product não usa trigger — UX já pode pré-filtrar via `useFieldMode`).
- Mascaramento server-side de SELECT em queries existentes — `selectVisible` é util genérico; integração em queries existe só em `list-products` como demonstração.
- Templates ganham field-rules default (`template_field_rules` table) — futuro.
- Field-rules com herança via parent-role — explícito por role, conforme spec.

---

## File Structure

| Arquivo                                                                               | Responsabilidade                                                   | Ação       |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------- |
| `supabase/migrations/20260528000068_field_catalog_and_role_field_rules.sql`           | Tabelas + RLS + seed catálogo inicial (cost_price, sale_price)     | CREATE     |
| `supabase/migrations/20260528000069_field_mode_helpers.sql`                           | Helpers `user_field_mode` + `visible_columns`                      | CREATE     |
| `supabase/migrations/20260528000070_products_enforce_field_rules.sql`                 | Trigger BEFORE UPDATE em `products` + função `enforce_field_rules` | CREATE     |
| `src/types/database.types.ts`                                                         | Regen                                                              | REGENERATE |
| `src/modules/authz/queries/list-field-catalog.ts`                                     | Lista catálogo agrupado por módulo                                 | CREATE     |
| `src/modules/authz/queries/list-role-field-rules.ts`                                  | Lista rules de uma role                                            | CREATE     |
| `src/modules/authz/queries/get-user-field-modes.ts`                                   | Bootstrap dos modes pro PermissionsProvider                        | CREATE     |
| `src/modules/authz/actions/update-role-field-rules.ts`                                | Replace de rules de uma role                                       | CREATE     |
| `src/modules/authz/services/field-rules.ts`                                           | `selectVisible<T>()` util                                          | CREATE     |
| `src/modules/authz/services/__tests__/field-rules.test.ts`                            | Unit                                                               | CREATE     |
| `src/modules/authz/hooks/use-field-mode.ts`                                           | Hook leitura do contexto                                           | CREATE     |
| `src/modules/authz/components/permissions-provider.tsx`                               | Aceita `fieldModes` prop + expõe via context                       | MODIFY     |
| `src/modules/authz/index.ts`                                                          | Barrel: novos exports                                              | MODIFY     |
| `src/modules/authz/client.ts`                                                         | Barrel client: useFieldMode + updateRoleFieldRulesAction           | MODIFY     |
| `src/app/(dashboard)/[companySlug]/layout.tsx`                                        | Passa `fieldModes` pro provider                                    | MODIFY     |
| `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx`                  | Aba "Campos"                                                       | MODIFY     |
| `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/role-field-rules-form.tsx` | Form de field-rules                                                | CREATE     |
| `src/modules/inventory/components/product-form.tsx`                                   | `useFieldMode` em cost_price + sale_price                          | MODIFY     |

---

## Pre-requisite: branch setup

- [ ] **Step 0: Branch a partir de `feat/roles-evolution`**

```bash
git checkout feat/roles-evolution
git pull
git checkout -b feat/field-level-masking
```

---

## Task 1: Migration 068 — field_catalog + role_field_rules

**Files:**

- Create: `supabase/migrations/20260528000068_field_catalog_and_role_field_rules.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260528000068_field_catalog_and_role_field_rules.sql
-- PR #H da evolução de roles: field-level masking. Catálogo de colunas
-- mascaráveis em field_catalog (global). Atribuição em role_field_rules
-- (por role × coluna). Sem rule = editable (backward-compat).

-- ─── field_catalog: catálogo global ──────────────────────────────────────────
create table public.field_catalog (
  table_name   text not null,
  column_name  text not null,
  label        text not null,
  description  text,
  module_code  text references public.modules(code) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (table_name, column_name)
);

create index idx_field_catalog_module on public.field_catalog(module_code);

alter table public.field_catalog enable row level security;

create policy "field_catalog_select" on public.field_catalog
  for select using (auth.uid() is not null);

create policy "field_catalog_write_platform" on public.field_catalog
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.field_catalog is
  'PR #H: catálogo de colunas mascaráveis. (table_name, column_name) PK. Apenas platform admin escreve.';

-- ─── role_field_rules: atribuição de modo a (role × column) ──────────────────
create table public.role_field_rules (
  role_id      uuid not null references public.roles(id) on delete cascade,
  table_name   text not null,
  column_name  text not null,
  mode         text not null check (mode in ('hidden','readonly','editable')),
  granted_at   timestamptz not null default now(),
  primary key (role_id, table_name, column_name),
  foreign key (table_name, column_name)
    references public.field_catalog(table_name, column_name)
    on delete cascade
);

create index idx_role_field_rules_role on public.role_field_rules(role_id);
create index idx_role_field_rules_table on public.role_field_rules(table_name);

alter table public.role_field_rules enable row level security;

create policy "role_field_rules_select" on public.role_field_rules
  for select using (
    role_id in (
      select id from public.roles
      where company_id in (select public.user_company_ids())
    )
    or public.is_platform_admin()
  );

create policy "role_field_rules_write" on public.role_field_rules
  for all using (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_field_rules.role_id
        and public.has_permission(r.company_id, 'core:role:manage')
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_field_rules.role_id
        and public.has_permission(r.company_id, 'core:role:manage')
    )
  );

comment on table public.role_field_rules is
  'PR #H: atribuição de modo (hidden/readonly/editable) por role × coluna. Sem row = editable.';

-- ─── Seed inicial: colunas sensíveis de products ─────────────────────────────
insert into public.field_catalog (table_name, column_name, label, description, module_code) values
  ('products', 'cost_price', 'Preço de custo', 'Custo de aquisição/produção. Visível apenas a roles autorizadas.', 'inventory'),
  ('products', 'sale_price', 'Preço de venda', 'Preço final ao cliente. Mascarável por role.', 'inventory')
on conflict (table_name, column_name) do nothing;
```

- [ ] **Step 2: Aplicar via MCP** (`name: field_catalog_and_role_field_rules`).

- [ ] **Step 3: Validar**

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in ('field_catalog','role_field_rules');
```

Expected: 2 rows.

```sql
select table_name, column_name, module_code from public.field_catalog order by 1,2;
```

Expected: 2 rows (`products.cost_price`, `products.sale_price`), both `module_code='inventory'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260528000068_field_catalog_and_role_field_rules.sql
git commit -m "feat(authz): field_catalog + role_field_rules (PR #H)

PR #H da evolução de roles. Tabelas globais para field-level masking.
field_catalog: catálogo de colunas mascaráveis (PK composta table+column).
role_field_rules: atribuição de modo (hidden/readonly/editable) por role.
RLS: write em role_field_rules via core:role:manage. Seed inicial:
products.cost_price + products.sale_price."
```

---

## Task 2: Migration 069 — helpers user_field_mode + visible_columns

**Files:**

- Create: `supabase/migrations/20260528000069_field_mode_helpers.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260528000069_field_mode_helpers.sql
-- PR #H: helpers para resolver modo efetivo de campo por user.
-- Regra de combinação: para um user com N roles, o modo mais restritivo
-- vence. Ordem: hidden > readonly > editable. Sem rule em nenhuma
-- role = editable (backward-compat).

create or replace function public.user_field_mode(
  p_company uuid, p_table text, p_column text
) returns text
language plpgsql stable security definer set search_path = public as $$
declare v_modes text[];
begin
  if public.is_platform_admin() then
    return 'editable';
  end if;

  select array_agg(distinct rfr.mode) into v_modes
  from public.memberships m
  join public.membership_roles mr on mr.membership_id = m.id
  join public.role_field_rules rfr on rfr.role_id = mr.role_id
  where m.user_id = auth.uid()
    and m.company_id = p_company
    and m.status = 'active'
    and rfr.table_name = p_table
    and rfr.column_name = p_column;

  if v_modes is null then return 'editable'; end if;
  if 'hidden'   = any(v_modes) then return 'hidden';   end if;
  if 'readonly' = any(v_modes) then return 'readonly'; end if;
  return 'editable';
end $$;

comment on function public.user_field_mode(uuid, text, text) is
  'PR #H: resolve modo efetivo (hidden/readonly/editable) por user×company×coluna. Mais restritivo vence.';

create or replace function public.visible_columns(p_company uuid, p_table text)
returns setof text
language sql stable security definer set search_path = public as $$
  select column_name from public.field_catalog
  where table_name = p_table
    and public.user_field_mode(p_company, p_table, column_name) <> 'hidden';
$$;

comment on function public.visible_columns(uuid, text) is
  'PR #H: setof colunas do catálogo que NÃO estão hidden para o user atual.';
```

- [ ] **Step 2: Aplicar via MCP** (`name: field_mode_helpers`).

- [ ] **Step 3: Validar**

```sql
select proname from pg_proc
where proname in ('user_field_mode','visible_columns')
  and pronamespace = (select oid from pg_namespace where nspname='public');
```

Expected: 2 rows.

```sql
-- Auth context vazio → deve retornar 'editable' (no rules)
select public.user_field_mode(
  (select id from companies limit 1),
  'products', 'cost_price'
);
```

Expected: `editable`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260528000069_field_mode_helpers.sql
git commit -m "feat(authz): user_field_mode + visible_columns helpers (PR #H)

PR #H. Resolve modo efetivo (mais restritivo vence: hidden > readonly >
editable). visible_columns retorna setof column_name não-ocultas para a
tabela. Backward-compat: sem rule = editable. Platform admin = editable."
```

---

## Task 3: Migration 070 — trigger enforce_field_rules em products

**Files:**

- Create: `supabase/migrations/20260528000070_products_enforce_field_rules.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260528000070_products_enforce_field_rules.sql
-- PR #H: trigger BEFORE UPDATE em products. Compara to_jsonb(new) vs
-- to_jsonb(old) por coluna do catálogo; se mudou e modo é hidden/readonly,
-- bloqueia com P0403. Garante que mascaramento client não pode ser burlado
-- via PostgREST direto.

create or replace function public.enforce_field_rules()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_col record;
  v_mode text;
  v_company uuid;
begin
  -- assume NEW tem coluna company_id (tabelas mascaradas precisam ter)
  v_company := new.company_id;

  for v_col in
    select column_name
    from public.field_catalog
    where table_name = TG_TABLE_NAME
  loop
    if to_jsonb(new) -> v_col.column_name
       is distinct from to_jsonb(old) -> v_col.column_name
    then
      v_mode := public.user_field_mode(v_company, TG_TABLE_NAME, v_col.column_name);
      if v_mode in ('hidden','readonly') then
        raise exception 'Coluna % é somente leitura para este usuário', v_col.column_name
          using errcode = 'P0403';
      end if;
    end if;
  end loop;

  return new;
end $$;

comment on function public.enforce_field_rules() is
  'PR #H: trigger handler genérico. Bloqueia UPDATE em coluna readonly/hidden por user.';

create trigger trg_enforce_field_rules_products
  before update on public.products
  for each row execute function public.enforce_field_rules();

comment on trigger trg_enforce_field_rules_products on public.products is
  'PR #H: enforce field-level masking em products.';
```

- [ ] **Step 2: Aplicar via MCP** (`name: products_enforce_field_rules`).

- [ ] **Step 3: Validar**

```sql
select tgname from pg_trigger where tgname = 'trg_enforce_field_rules_products';
```

Expected: 1 row.

```sql
select proname from pg_proc
where proname = 'enforce_field_rules'
  and pronamespace = (select oid from pg_namespace where nspname='public');
```

Expected: 1 row.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260528000070_products_enforce_field_rules.sql
git commit -m "feat(inventory): trigger enforce_field_rules em products (PR #H)

PR #H. Trigger BEFORE UPDATE em products. Para cada coluna do
field_catalog que mudou no UPDATE, consulta user_field_mode; se
hidden/readonly bloqueia com P0403. Mascaramento client = UX/perf;
trigger = autoridade."
```

---

## Task 4: Regen types

**Files:**

- Modify: `src/types/database.types.ts`

- [ ] **Step 1: Regenerar via MCP `generate_typescript_types`**. Sobrescrever `src/types/database.types.ts`.

- [ ] **Step 2: Verificar diff**

```bash
git diff src/types/database.types.ts | head -60
```

Expected: tipos novos `field_catalog`, `role_field_rules`, funções `user_field_mode`, `visible_columns`, `enforce_field_rules`.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: 0 erros.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regenerate database types for PR #H migrations"
```

---

## Task 5: Backend TS — queries + action + service

**Files:**

- Create: `src/modules/authz/queries/list-field-catalog.ts`
- Create: `src/modules/authz/queries/list-role-field-rules.ts`
- Create: `src/modules/authz/queries/get-user-field-modes.ts`
- Create: `src/modules/authz/actions/update-role-field-rules.ts`
- Create: `src/modules/authz/services/field-rules.ts`
- Create: `src/modules/authz/services/__tests__/field-rules.test.ts`
- Modify: `src/modules/authz/index.ts` (barrel)

### Step 1: `list-field-catalog.ts`

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FieldCatalogEntry = {
  tableName: string;
  columnName: string;
  label: string;
  description: string | null;
  moduleCode: string | null;
};

export type FieldCatalogByModule = Record<string, FieldCatalogEntry[]>;

export async function listFieldCatalog(): Promise<FieldCatalogByModule> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("field_catalog")
    .select("table_name, column_name, label, description, module_code")
    .order("module_code")
    .order("table_name")
    .order("column_name");
  if (error) throw error;

  const grouped: FieldCatalogByModule = {};
  for (const row of data ?? []) {
    const key = row.module_code ?? "_unscoped";
    if (!grouped[key]) grouped[key] = [];
    grouped[key]!.push({
      tableName: row.table_name,
      columnName: row.column_name,
      label: row.label,
      description: row.description,
      moduleCode: row.module_code,
    });
  }
  return grouped;
}
```

### Step 2: `list-role-field-rules.ts`

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FieldMode = "hidden" | "readonly" | "editable";

export type RoleFieldRuleRow = {
  tableName: string;
  columnName: string;
  mode: FieldMode;
};

export type RoleFieldRulesByKey = Record<string, FieldMode>; // key = `${table}.${column}`

export async function listRoleFieldRules(roleId: string): Promise<RoleFieldRulesByKey> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_field_rules")
    .select("table_name, column_name, mode")
    .eq("role_id", roleId);
  if (error) throw error;

  const map: RoleFieldRulesByKey = {};
  for (const row of data ?? []) {
    map[`${row.table_name}.${row.column_name}`] = row.mode as FieldMode;
  }
  return map;
}
```

### Step 3: `get-user-field-modes.ts`

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FieldMode } from "./list-role-field-rules";

export type UserFieldModes = Record<string, FieldMode>; // key = `${table}.${column}`

/**
 * Bootstrap dos modes do user para a empresa atual.
 * Para cada (table_name, column_name) do field_catalog, resolve user_field_mode.
 * Resultado é injetado no PermissionsProvider para o hook useFieldMode().
 */
export async function getUserFieldModes(companyId: string): Promise<UserFieldModes> {
  const supabase = await createClient();
  const { data: catalog, error: catErr } = await supabase
    .from("field_catalog")
    .select("table_name, column_name");
  if (catErr) throw catErr;
  if (!catalog || catalog.length === 0) return {};

  const result: UserFieldModes = {};
  await Promise.all(
    catalog.map(async (row) => {
      const { data: mode, error } = await supabase.rpc("user_field_mode", {
        p_company: companyId,
        p_table: row.table_name,
        p_column: row.column_name,
      });
      if (error) return;
      result[`${row.table_name}.${row.column_name}`] = (mode ?? "editable") as FieldMode;
    }),
  );
  return result;
}
```

### Step 4: `update-role-field-rules.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "../services/authz-service";
import { audit } from "@/modules/audit";
import type { FieldMode } from "../queries/list-role-field-rules";

export type FieldRuleInput = {
  tableName: string;
  columnName: string;
  mode: FieldMode;
};

/**
 * Replace-mode: apaga todas as rules da role e insere as novas (apenas
 * as com mode != 'editable', pois editable = ausência de rule).
 */
export async function updateRoleFieldRulesAction(
  companyId: string,
  roleId: string,
  rules: FieldRuleInput[],
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:role:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar roles" };
  }

  const supabase = await createClient();

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!role) return { ok: false, message: "Role não encontrada" };

  const { error: delErr } = await supabase.from("role_field_rules").delete().eq("role_id", roleId);
  if (delErr) return { ok: false, message: delErr.message };

  const toInsert = rules
    .filter((r) => r.mode !== "editable")
    .map((r) => ({
      role_id: roleId,
      table_name: r.tableName,
      column_name: r.columnName,
      mode: r.mode,
    }));

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from("role_field_rules").insert(toInsert);
    if (insErr) return { ok: false, message: insErr.message };
  }

  await audit({
    companyId,
    action: "role.field_rules_update",
    resourceType: "role",
    resourceId: roleId,
    status: "success",
    metadata: { count: toInsert.length },
  });

  revalidatePath(`/[companySlug]/settings/roles/${roleId}`, "page");
  return { ok: true, message: "Regras de campo atualizadas" };
}
```

### Step 5: `field-rules.ts` (selectVisible util)

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Util genérico: dado um companyId + table, retorna a lista de colunas
 * que o user atual PODE ver (filtra hidden via visible_columns RPC).
 * Para uso em queries — o caller monta o SELECT com essa lista.
 *
 * Sempre inclui 'id' como fallback (RPC pode retornar lista vazia se o
 * field_catalog não cobrir a tabela ou usuário tem tudo escondido).
 */
export async function listVisibleColumns(companyId: string, tableName: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("visible_columns", {
    p_company: companyId,
    p_table: tableName,
  });
  if (error) throw error;
  const cols = (data ?? []) as unknown as string[];
  return cols.length > 0 ? cols : ["id"];
}
```

### Step 6: Test `field-rules.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";

// Mock createClient via path-relative
vi.mock("@/lib/supabase/server", () => {
  return {
    createClient: vi.fn(),
  };
});

import { createClient } from "@/lib/supabase/server";
import { listVisibleColumns } from "../field-rules";

describe("listVisibleColumns", () => {
  it("retorna colunas do RPC quando há resultado", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: ["id", "name", "sale_price"], error: null }),
    });

    const cols = await listVisibleColumns("co-1", "products");
    expect(cols).toEqual(["id", "name", "sale_price"]);
  });

  it("retorna ['id'] quando RPC retorna vazio (fallback)", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const cols = await listVisibleColumns("co-1", "products");
    expect(cols).toEqual(["id"]);
  });

  it("lança quando RPC erra", async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
    });

    await expect(listVisibleColumns("co-1", "products")).rejects.toThrow();
  });
});
```

### Step 7: Atualizar barrel `src/modules/authz/index.ts`

Adicionar:

```ts
export { listFieldCatalog } from "./queries/list-field-catalog";
export type { FieldCatalogEntry, FieldCatalogByModule } from "./queries/list-field-catalog";
export { listRoleFieldRules } from "./queries/list-role-field-rules";
export type {
  FieldMode,
  RoleFieldRuleRow,
  RoleFieldRulesByKey,
} from "./queries/list-role-field-rules";
export { getUserFieldModes } from "./queries/get-user-field-modes";
export type { UserFieldModes } from "./queries/get-user-field-modes";
export { updateRoleFieldRulesAction } from "./actions/update-role-field-rules";
export type { FieldRuleInput } from "./actions/update-role-field-rules";
export { listVisibleColumns } from "./services/field-rules";
```

### Step 8: Run tests + typecheck

```bash
npm run typecheck && npx vitest run src/modules/authz/services/__tests__/field-rules.test.ts
```

Expected: 0 erros TS + 3 testes passam.

### Step 9: Commit

```bash
git add src/modules/authz/queries/ \
        src/modules/authz/actions/update-role-field-rules.ts \
        src/modules/authz/services/field-rules.ts \
        src/modules/authz/services/__tests__/field-rules.test.ts \
        src/modules/authz/index.ts
git commit -m "feat(authz): field rules backend — catalog/rules/modes + selectVisible (PR #H)

PR #H. 3 queries (listFieldCatalog, listRoleFieldRules, getUserFieldModes
para bootstrap do contexto). 1 action replace-mode (updateRoleFieldRules,
gateada por core:role:manage). Util listVisibleColumns (chama RPC
visible_columns) + 3 unit tests."
```

---

## Task 6: Client provider + hook + layout integration

**Files:**

- Modify: `src/modules/authz/components/permissions-provider.tsx`
- Create: `src/modules/authz/hooks/use-field-mode.ts`
- Modify: `src/modules/authz/client.ts` (barrel)
- Modify: `src/modules/authz/index.ts` (re-export do hook server-safe se aplicável)
- Modify: `src/app/(dashboard)/[companySlug]/layout.tsx`

### Step 1: `permissions-provider.tsx` — adicionar fieldModes

Substituir conteúdo:

```tsx
"use client";
import { createContext, type ReactNode } from "react";

export type FieldMode = "hidden" | "readonly" | "editable";

export type FieldModesMap = Record<string, FieldMode>; // key = `${table}.${column}`

type PermissionsContextValue = {
  permissions: Set<string>;
  fieldModes: FieldModesMap;
};

export const PermissionsContext = createContext<PermissionsContextValue>({
  permissions: new Set(),
  fieldModes: {},
});

export function PermissionsProvider({
  permissions,
  fieldModes,
  children,
}: {
  permissions: string[];
  fieldModes?: FieldModesMap;
  children: ReactNode;
}) {
  return (
    <PermissionsContext.Provider
      value={{ permissions: new Set(permissions), fieldModes: fieldModes ?? {} }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}
```

### Step 2: Atualizar `use-permissions.ts`

Verificar: o hook lê `useContext(PermissionsContext)` e hoje devolve `Set<string>`. Após a mudança do provider, o context value mudou de `Set<string>` para `{ permissions, fieldModes }`. Atualizar consumidores.

Editar `src/modules/authz/hooks/use-permissions.ts`:

```ts
"use client";
import { useContext } from "react";
import { PermissionsContext } from "../components/permissions-provider";

export function usePermissions(): Set<string> {
  const ctx = useContext(PermissionsContext);
  return ctx.permissions;
}
```

### Step 3: Criar `use-field-mode.ts`

```ts
"use client";
import { useContext } from "react";
import { PermissionsContext, type FieldMode } from "../components/permissions-provider";

/**
 * Retorna o modo efetivo de uma coluna para o user atual.
 * Default: 'editable' (sem rule = irrestrito).
 */
export function useFieldMode(tableName: string, columnName: string): FieldMode {
  const ctx = useContext(PermissionsContext);
  return ctx.fieldModes[`${tableName}.${columnName}`] ?? "editable";
}
```

### Step 4: Atualizar `client.ts` barrel

```ts
// adicionar:
export { useFieldMode } from "./hooks/use-field-mode";
export type { FieldMode, FieldModesMap } from "./components/permissions-provider";
export { updateRoleFieldRulesAction } from "./actions/update-role-field-rules";
```

### Step 5: Atualizar `index.ts` (server barrel) — re-exports server-safe

Garantir que `PermissionsProvider` re-export continua e adicionar tipos `FieldMode`/`FieldModesMap` se desejado. (Importação de provider pelo layout já existe.)

### Step 6: Modificar `layout.tsx` p/ passar fieldModes

`src/app/(dashboard)/[companySlug]/layout.tsx` — adicionar bootstrap dos modes ao lado de `getEffectivePermissions`:

```tsx
import { getEffectivePermissions, PermissionsProvider, getUserFieldModes } from "@/modules/authz";

// dentro do layout (após resolver companyId):
const [perms, fieldModes] = await Promise.all([
  getEffectivePermissions(companyId),
  getUserFieldModes(companyId),
]);

return (
  <PermissionsProvider permissions={[...perms]} fieldModes={fieldModes}>
    {children}
  </PermissionsProvider>
);
```

> Ler o arquivo primeiro pra preservar a assinatura existente (companyId vem de `params.companySlug` resolvido via tenancy).

### Step 7: Typecheck

```bash
npm run typecheck
```

Expected: 0 erros. Se algum consumidor de `usePermissions` quebrar (acessava como Set diretamente), ajustar para usar o hook.

### Step 8: Commit

```bash
git add src/modules/authz/components/permissions-provider.tsx \
        src/modules/authz/hooks/use-permissions.ts \
        src/modules/authz/hooks/use-field-mode.ts \
        src/modules/authz/client.ts \
        src/modules/authz/index.ts \
        'src/app/(dashboard)/[companySlug]/layout.tsx'
git commit -m "feat(authz): PermissionsProvider expõe fieldModes + useFieldMode hook (PR #H)

PR #H. Provider passa a transportar {permissions, fieldModes}.
useFieldMode(table, column) devolve hidden/readonly/editable.
Layout faz bootstrap via getUserFieldModes em paralelo com
getEffectivePermissions."
```

---

## Task 7: UI — aba "Campos" no role detail

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx`
- Create: `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/role-field-rules-form.tsx`

### Step 1: Ler `[roleId]/page.tsx` para entender Tabs existentes

```bash
cat 'src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx'
```

Após PR #G a página já tem Tabs (Permissões, Membros, Escopo). Adicionar aba "Campos".

### Step 2: Criar `role-field-rules-form.tsx`

```tsx
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateRoleFieldRulesAction } from "@/modules/authz/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FieldCatalogByModule, FieldMode, RoleFieldRulesByKey } from "@/modules/authz";

type Props = {
  companyId: string;
  roleId: string;
  catalog: FieldCatalogByModule;
  currentRules: RoleFieldRulesByKey;
};

const MODES: { value: FieldMode; label: string; tone: string }[] = [
  { value: "editable", label: "Editável", tone: "text-foreground" },
  { value: "readonly", label: "Somente leitura", tone: "text-yellow-700" },
  { value: "hidden", label: "Oculto", tone: "text-red-700" },
];

export function RoleFieldRulesForm({ companyId, roleId, catalog, currentRules }: Props) {
  const [state, setState] = useState<RoleFieldRulesByKey>(currentRules);
  const [isPending, startTransition] = useTransition();

  function setMode(table: string, column: string, mode: FieldMode) {
    const key = `${table}.${column}`;
    setState((prev) => {
      const next = { ...prev };
      if (mode === "editable") delete next[key];
      else next[key] = mode;
      return next;
    });
  }

  function handleSave() {
    const rules = Object.entries(state).map(([key, mode]) => {
      const [tableName, columnName] = key.split(".");
      return { tableName: tableName!, columnName: columnName!, mode };
    });

    startTransition(async () => {
      const r = await updateRoleFieldRulesAction(companyId, roleId, rules);
      if (r.ok) toast.success(r.message ?? "Salvo");
      else toast.error(r.message ?? "Erro");
    });
  }

  const modules = Object.keys(catalog).sort();

  if (modules.length === 0) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Nenhuma coluna mascarável cadastrada no catálogo.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {modules.map((mod) => (
        <div key={mod} className="rounded border">
          <header className="border-b px-3 py-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {mod}
          </header>
          <div className="divide-y">
            {catalog[mod]!.map((entry) => {
              const key = `${entry.tableName}.${entry.columnName}`;
              const current: FieldMode = state[key] ?? "editable";
              return (
                <div key={key} className="grid gap-2 px-3 py-3 md:grid-cols-[1fr_auto]">
                  <div>
                    <Label className="font-medium">
                      {entry.label}{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {entry.tableName}.{entry.columnName}
                      </span>
                    </Label>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                    )}
                  </div>
                  <RadioGroup
                    value={current}
                    onValueChange={(v) =>
                      setMode(entry.tableName, entry.columnName, v as FieldMode)
                    }
                    className="flex gap-3"
                  >
                    {MODES.map((m) => (
                      <div key={m.value} className="flex items-center gap-1">
                        <RadioGroupItem id={`${key}-${m.value}`} value={m.value} />
                        <Label htmlFor={`${key}-${m.value}`} className={`text-xs ${m.tone}`}>
                          {m.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar regras de campo"}
      </Button>
    </div>
  );
}
```

### Step 3: Adicionar aba "Campos" no `page.tsx`

No bloco de Tabs existente, adicionar:

```tsx
import { listFieldCatalog, listRoleFieldRules } from "@/modules/authz";
import { RoleFieldRulesForm } from "./role-field-rules-form";

// no Server Component, junto dos outros await:
const [catalog, currentRules] = await Promise.all([
  listFieldCatalog(),
  listRoleFieldRules(roleId),
]);

// dentro de <Tabs>:
<TabsTrigger value="fields">Campos</TabsTrigger>
// ...
<TabsContent value="fields">
  <RoleFieldRulesForm
    companyId={companyId}
    roleId={roleId}
    catalog={catalog}
    currentRules={currentRules}
  />
</TabsContent>
```

> Se o componente Shadcn `radio-group` ainda não foi instalado, rodar: `npx shadcn@latest add radio-group`.

### Step 4: Typecheck + lint

```bash
npm run typecheck && npm run lint
```

Expected: 0 erros + lint pass (warnings pré-existentes OK).

### Step 5: Commit

```bash
git add 'src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx' \
        'src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/role-field-rules-form.tsx'
# Se radio-group adicionado:
git add 'src/components/ui/radio-group.tsx' components.json package.json package-lock.json 2>/dev/null || true
git commit -m "feat(ui): aba Campos no role detail (PR #H)

PR #H. /settings/roles/[id] ganha aba 'Campos' com form que agrupa o
field_catalog por módulo e permite definir hidden/readonly/editable
por coluna. Replace-mode: editable = ausência de rule."
```

---

## Task 8: Product form usa useFieldMode

**Files:**

- Modify: `src/modules/inventory/components/product-form.tsx`

### Step 1: Editar `product-form.tsx`

Adicionar import e aplicar `useFieldMode` nos campos `cost_price` e `sale_price`:

```tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
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
import type { Product } from "../types";
import type { ActionResult } from "@/lib/errors";
import { useFieldMode } from "@/modules/authz/client";

// ... resto igual até o JSX dos campos cost_price / sale_price:

const costMode = useFieldMode("products", "cost_price");
const saleMode = useFieldMode("products", "sale_price");

// Substituir o Field de "Preço de custo" e "Preço de venda" por versões
// condicionais. Helper inline:

function MaskedField(props: FieldProps & { mode: "hidden" | "readonly" | "editable" }) {
  if (props.mode === "hidden") return null;
  return <Field {...props} disabledOverride={props.mode === "readonly"} />;
}
```

Ajustar `Field` para aceitar `disabledOverride?: boolean` e aplicar `disabled` / `readOnly` no `<Input>`. Substituir os dois Fields antigos por `MaskedField` correspondentes.

Patch completo do bloco JSX dos dois campos sensíveis:

```tsx
<MaskedField
  mode={costMode}
  label="Preço de custo (R$)"
  name="costPrice"
  type="number"
  step="0.01"
  defaultValue={String(product?.cost_price ?? 0)}
  error={fieldErrors?.costPrice?.[0]}
/>
<MaskedField
  mode={saleMode}
  label="Preço de venda (R$)"
  name="salePrice"
  type="number"
  step="0.01"
  defaultValue={String(product?.sale_price ?? 0)}
  error={fieldErrors?.salePrice?.[0]}
/>
```

E `Field` atualizado para suportar `disabledOverride`:

```tsx
type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  error?: string;
  step?: string;
  defaultValue?: string;
  placeholder?: string;
  disabledOverride?: boolean;
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
  disabledOverride,
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
        required={required && !disabledOverride}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-invalid={!!error}
        readOnly={disabledOverride}
        disabled={disabledOverride}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

### Step 2: Typecheck + lint

```bash
npm run typecheck && npm run lint
```

Expected: 0 erros.

### Step 3: Commit

```bash
git add src/modules/inventory/components/product-form.tsx
git commit -m "feat(inventory): product form respeita useFieldMode (PR #H)

PR #H. Form de produto usa useFieldMode('products', 'cost_price') e
('products', 'sale_price') para esconder ou marcar como readonly os
campos conforme regras de field-level do role do user."
```

---

## Task 9: Push + PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/field-level-masking
```

- [ ] **Step 2: Abrir PR** base=`feat/roles-evolution`

```bash
gh pr create --base feat/roles-evolution --head feat/field-level-masking \
  --title "feat(authz): field-level masking — products (PR #H)" \
  --body "$(cat <<'EOF'
## Summary

PR #H da evolução de roles & permissões. Habilita **field-level masking**
(column-level access control). Roles podem marcar colunas como
\`hidden\`, \`readonly\` ou \`editable\` via catálogo global.

- 2 tabelas globais: \`field_catalog\` + \`role_field_rules\`.
- Helpers SQL: \`user_field_mode\` (mais restritivo vence) + \`visible_columns\`.
- Trigger \`enforce_field_rules\` (BEFORE UPDATE em \`products\`) bloqueia escrita
  com \`P0403\` em coluna readonly/hidden.
- \`PermissionsProvider\` carrega \`fieldModes\` no boot do layout do dashboard;
  hook \`useFieldMode(table, column)\` retorna o modo efetivo.
- UI: aba "Campos" em \`/settings/roles/[id]\` lista catálogo por módulo + radio.
- \`product-form\` esconde/disables \`cost_price\` e \`sale_price\` conforme mode.
- Seed inicial: \`products.cost_price\` e \`products.sale_price\`.

## Migrations

- \`20260528000068_field_catalog_and_role_field_rules.sql\`
- \`20260528000069_field_mode_helpers.sql\`
- \`20260528000070_products_enforce_field_rules.sql\`

## Test plan

### DB
- [ ] \`field_catalog\` + \`role_field_rules\` criadas; seed inicial OK
- [ ] Helpers \`user_field_mode\` + \`visible_columns\` existem
- [ ] Trigger \`trg_enforce_field_rules_products\` instalado
- [ ] Sem rule: \`user_field_mode\` devolve \`editable\` (backward-compat)

### TS
- [x] \`npm run typecheck\`
- [x] \`npm run lint\`
- [x] \`npx vitest run\` (field-rules tests)

### Manual (em company de teste)
- [ ] Owner cria role "Vendedor sem custo"
- [ ] Aba **Campos** → \`products.cost_price\` marcar **Oculto**, \`sale_price\` **Editável** → Salvar
- [ ] Atribuir role ao user X (operator)
- [ ] User X loga, abre form de produto → não vê campo Preço de custo
- [ ] User X tenta UPDATE direto em \`products.cost_price\` via Supabase REST → trigger bloqueia (\`P0403\`)
- [ ] User X edita produto e altera \`sale_price\` → sucesso
- [ ] Owner edita o mesmo produto → ambos campos visíveis e editáveis
- [ ] Trocar regra de \`sale_price\` para **Somente leitura** → user X vê o campo desabilitado

## Notas

- **Não inclui**: trigger em outras tabelas (movements/kb), field-rules em INSERT, mascaramento server-side default em queries (\`selectVisible\` exposto como util).
- **Performance**: trigger compara \`to_jsonb(new) vs to_jsonb(old)\` por coluna do catálogo (2 hoje). Aceitável em CRUD; revisar se bulk ingest entrar em jogo.
- **Risk**: \`enforce_field_rules\` assume \`new.company_id\` — tabelas mascaradas precisam ter essa coluna.

Base: \`feat/roles-evolution\` (após merge de #G).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

- **Spec coverage Fase 4**: 2 tabelas globais ✓, helpers ✓, trigger ✓, mascaramento client (provider + hook) ✓, UI aba Campos ✓, field-catalog inicial cost_price + sale_price ✓. (Spec menciona `profit_margin` mas products não tem essa coluna hoje — substituído por `sale_price` que existe e é igualmente sensível.)
- **Placeholders**: zero TBD/TODO; cada step traz código completo. Único caveat: Task 7 Step 1 pede ler `page.tsx` antes de patch — necessário porque shape de Tabs depende de PRs anteriores; instrução é específica, não placeholder.
- **Type consistency**: `FieldMode` definido em `list-role-field-rules.ts` e reexportado em provider; ambos têm o mesmo literal union. `FieldRuleInput` (action) e `RoleFieldRuleRow` (query) divergem por convenção (action recebe camelCase do client; row vem do DB). OK.
- **Backward-compat**: sem rule = editable; sem entrada no catálogo = trigger ignora; provider default `fieldModes: {}`.
- **Rollback**: drop tables/trigger/functions reversíveis.

## YAGNI (fora desta PR)

- Field-rules em INSERT (apenas UPDATE; UX já cobre via hook).
- Triggers em movements/kb/etc. — adicionar conforme demanda real.
- `template_field_rules` (templates ganham rules default) — futuro.
- Mascaramento default em todas as queries existentes — `listVisibleColumns` exposto como util mas não cabe ainda integrar em `list-products` (a tabela já tem listagem segura por RLS).
- UI admin platform para CRUD do `field_catalog` — por enquanto seed via migration.
- Field-rules hierárquicas via parent role — explícito por role, conforme spec.
