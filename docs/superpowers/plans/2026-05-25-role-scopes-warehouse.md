# PR #G — Scopes dimensionais (warehouse) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar scoping de permissões por dimensão (primeira dimensão concreta: `warehouse`/depósito). Role sem scope = irrestrita (backward-compat). Role com scope = filtrada por dimensão. Aplicado em `products` (RLS + trigger). Inclui UI mínima: CRUD de warehouses + aba "Escopo" no role detail.

**Architecture:**

- 2 tabelas globais: `scope_dimensions` (catálogo) + `role_scopes` (atribuições).
- 1 tabela tenant: `warehouses` (primeira dimensão).
- Helpers SQL: `user_scope_values`, `user_has_scope`.
- Coluna `products.warehouse_id` (nullable — produtos sem dimensão acessíveis).
- RLS de `products` ganha check de scope.
- Trigger BEFORE INSERT/UPDATE valida write em warehouse fora do scope.
- UI: `/[companySlug]/settings/warehouses` (CRUD) + aba "Escopo" em `/settings/roles/[roleId]`.

**Tech Stack:** Supabase Postgres · plpgsql · RLS · TS Server Actions · Shadcn.

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção "Fase 3".

**Depende de:** PRs #A–#F (em `feat/roles-evolution`).

**Não inclui:**

- Outras dimensões além de warehouse (branch, cost_center) — adicionar quando houver demanda; modelo já permite.
- Scoping em stock_movements, kb_articles, etc. — products só nesta PR; outras tabelas em PRs follow-up.
- Validação de UI quando admin atribui scope inexistente — Postgres FK já bloqueia.
- Templates ganham scopes default — possível em template_scopes table futura; fora desta PR.

---

## File Structure

| Arquivo                                                                           | Responsabilidade                          | Ação       |
| --------------------------------------------------------------------------------- | ----------------------------------------- | ---------- |
| `supabase/migrations/20260525000064_scope_dimensions_and_role_scopes.sql`         | scope_dimensions + role_scopes + helpers  | CREATE     |
| `supabase/migrations/20260525000065_warehouses_table.sql`                         | warehouses table + seed dimension catalog | CREATE     |
| `supabase/migrations/20260525000066_products_warehouse_scoping.sql`               | products.warehouse_id + RLS + trigger     | CREATE     |
| `src/types/database.types.ts`                                                     | Regen                                     | REGENERATE |
| `src/modules/inventory/queries/list-warehouses.ts`                                | Lista warehouses da company               | CREATE     |
| `src/modules/inventory/actions/create-warehouse.ts`                               | CRUD warehouse                            | CREATE     |
| `src/modules/inventory/actions/update-warehouse.ts`                               | CRUD warehouse                            | CREATE     |
| `src/modules/inventory/actions/toggle-warehouse-active.ts`                        | CRUD warehouse                            | CREATE     |
| `src/modules/inventory/schemas/warehouse.ts`                                      | Zod                                       | CREATE     |
| `src/modules/inventory/index.ts`                                                  | Barrel                                    | MODIFY     |
| `src/modules/tenancy/queries/list-role-scopes.ts`                                 | Lista scopes da role                      | CREATE     |
| `src/modules/tenancy/actions/update-role-scopes.ts`                               | Replace scopes para role                  | CREATE     |
| `src/modules/tenancy/index.ts`                                                    | Barrel                                    | MODIFY     |
| `src/app/(dashboard)/[companySlug]/settings/warehouses/page.tsx`                  | Lista warehouses                          | CREATE     |
| `src/app/(dashboard)/[companySlug]/settings/warehouses/warehouse-form-dialog.tsx` | Create/edit dialog                        | CREATE     |
| `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx`              | Adiciona aba "Escopo"                     | MODIFY     |
| `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/role-scopes-form.tsx`  | Form de scopes                            | CREATE     |
| `src/core/navigation/menu.ts`                                                     | Link warehouses no sidebar                | MODIFY     |

---

## Pre-requisite: branch setup

- [ ] **Step 0: Branch from `feat/roles-evolution`**

```bash
git checkout feat/roles-evolution
git pull
git checkout -b feat/role-scopes
```

---

## Task 1: Migration 064 — scope_dimensions + role_scopes + helpers

**Files:**

- Create: `supabase/migrations/20260525000064_scope_dimensions_and_role_scopes.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000064_scope_dimensions_and_role_scopes.sql
-- PR #G da evolução de roles: scopes dimensionais. Role sem scope = irrestrita;
-- role com scope = restrita ao conjunto. Múltiplas dimensões = interseção.
-- User com N roles = união. Catálogo de dimensões em scope_dimensions;
-- atribuições em role_scopes.

-- ─── scope_dimensions: catálogo global ───────────────────────────────────────
create table public.scope_dimensions (
  code         text primary key,
  name         text not null,
  description  text,
  -- resolver_fn: nome opcional de função que valida scope_value (formato/existência).
  -- Não usado nesta PR mas reservado pra futura validação custom por dimensão.
  resolver_fn  text,
  created_at   timestamptz not null default now()
);

alter table public.scope_dimensions enable row level security;

create policy "scope_dimensions_select" on public.scope_dimensions
  for select using (auth.uid() is not null);

create policy "scope_dimensions_write_platform" on public.scope_dimensions
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.scope_dimensions is
  'PR #G: catálogo de dimensões de scope (warehouse, branch, etc.). Apenas platform admin escreve.';

-- ─── role_scopes: atribuição de scope a role ─────────────────────────────────
create table public.role_scopes (
  role_id        uuid not null references public.roles(id) on delete cascade,
  dimension_code text not null references public.scope_dimensions(code) on delete restrict,
  scope_value    text not null,
  granted_at     timestamptz not null default now(),
  primary key (role_id, dimension_code, scope_value)
);
create index idx_role_scopes_role on public.role_scopes(role_id);
create index idx_role_scopes_dim_value on public.role_scopes(dimension_code, scope_value);

alter table public.role_scopes enable row level security;

-- Leitura: quem vê a role vê seus scopes
create policy "role_scopes_select" on public.role_scopes
  for select using (
    role_id in (
      select id from public.roles
      where company_id in (select public.user_company_ids())
    )
    or public.is_platform_admin()
  );

-- Escrita: precisa de core:role:manage na empresa da role
create policy "role_scopes_write" on public.role_scopes
  for all using (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_scopes.role_id
        and public.has_permission(r.company_id, 'core:role:manage')
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from public.roles r
      where r.id = role_scopes.role_id
        and public.has_permission(r.company_id, 'core:role:manage')
    )
  );

comment on table public.role_scopes is
  'PR #G: atribuição de scope a role. Role sem rows em (role_id, dimension) = irrestrita naquela dimensão.';

-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- Retorna valores de scope que user tem acesso na dimensão.
-- Retorna ['*'] se irrestrito (alguma role do user não tem scope nessa dim).
create or replace function public.user_scope_values(p_company uuid, p_dimension text)
returns setof text
language plpgsql stable security definer set search_path = public as $$
declare v_has_unrestricted boolean;
begin
  if public.is_platform_admin() then
    return query select '*'::text;
    return;
  end if;

  select exists (
    select 1 from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    where m.user_id = auth.uid()
      and m.company_id = p_company
      and m.status = 'active'
      and not exists (
        select 1 from public.role_scopes rs
        where rs.role_id = mr.role_id and rs.dimension_code = p_dimension
      )
  ) into v_has_unrestricted;

  if v_has_unrestricted then
    return query select '*'::text;
    return;
  end if;

  return query
    select distinct rs.scope_value from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.role_scopes rs on rs.role_id = mr.role_id
    where m.user_id = auth.uid()
      and m.company_id = p_company
      and m.status = 'active'
      and rs.dimension_code = p_dimension;
end $$;

comment on function public.user_scope_values(uuid, text) is
  'PR #G: setof valores de scope que user tem acesso na empresa+dimensão. [''*''] = irrestrito.';

-- Boolean helper pra RLS USING/CHECK
create or replace function public.user_has_scope(p_company uuid, p_dimension text, p_value text)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
      or exists(
        select 1 from public.user_scope_values(p_company, p_dimension) v
        where v = '*' or v = p_value
      );
$$;

comment on function public.user_has_scope(uuid, text, text) is
  'PR #G: true se user tem acesso ao scope_value na empresa+dimensão (incluindo irrestrito).';
```

- [ ] **Step 2: Aplicar via MCP** (`name: scope_dimensions_and_role_scopes`).

- [ ] **Step 3: Validar:**

```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in ('scope_dimensions','role_scopes');
```

Expected: 2 rows.

```sql
select proname from pg_proc
where proname in ('user_scope_values','user_has_scope')
  and pronamespace = (select oid from pg_namespace where nspname='public');
```

Expected: 2 rows.

- [ ] **Step 4: Commit:**

```bash
git add supabase/migrations/20260525000064_scope_dimensions_and_role_scopes.sql
git commit -m "feat(authz): scope_dimensions + role_scopes + helpers

PR #G da evolução de roles. Tabelas globais para scopes dimensionais.
Helpers user_scope_values (retorna setof valores ou ['*']) e
user_has_scope (boolean). RLS: write em role_scopes via core:role:manage.

Backward-compat total: role sem scope = irrestrita naquela dimensão.
Schema only — primeira dimensão (warehouse) na 065; aplicação em products
na 066."
```

---

## Task 2: Migration 065 — warehouses + seed dimension

**Files:**

- Create: `supabase/migrations/20260525000065_warehouses_table.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000065_warehouses_table.sql
-- PR #G: primeira dimensão concreta — warehouse (depósito por empresa).
-- Seeda 'warehouse' em scope_dimensions.

create table public.warehouses (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  code        text not null,
  name        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, code)
);
create index idx_warehouses_company on public.warehouses(company_id);

alter table public.warehouses enable row level security;

create policy "warehouses_select" on public.warehouses
  for select using (
    public.is_platform_admin()
    or company_id in (select public.user_company_ids())
  );

-- Write: core:warehouse:manage; fallback owner=todos têm
-- (vai ser criado em seed; até lá só platform admin escreve)
create policy "warehouses_write" on public.warehouses
  for all using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'core:warehouse:manage')
  )
  with check (
    public.is_platform_admin()
    or public.has_permission(company_id, 'core:warehouse:manage')
  );

comment on table public.warehouses is
  'PR #G: depósitos por empresa. Primeira dimensão concreta de scope (dimension_code=warehouse).';

-- Seed da dimensão
insert into public.scope_dimensions (code, name, description)
values ('warehouse', 'Depósito', 'Restringe acesso por depósito. scope_value = warehouses.id (uuid).')
on conflict (code) do nothing;

-- Seed da permissão de manage warehouses
insert into public.permissions (code, module_code, resource, action, description)
values ('core:warehouse:manage', 'core', 'warehouse', 'manage', 'Gerenciar depósitos')
on conflict (code) do nothing;

-- Propaga perm pra system roles e templates: owner + manager têm; operator não
insert into public.template_permissions (template_code, permission_code)
select tc, 'core:warehouse:manage' from (values ('owner'), ('manager')) v(tc)
on conflict do nothing;

insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, 'core:warehouse:manage', true
from public.roles r
where r.is_system and r.code in ('owner','manager')
on conflict do nothing;
```

- [ ] **Step 2: Aplicar via MCP** (`name: warehouses_table`).

- [ ] **Step 3: Validar:**

```sql
select code, name from scope_dimensions where code = 'warehouse';
```

Expected: 1 row.

```sql
select count(*) as roles_with_warehouse_manage
from role_permissions
where permission_code = 'core:warehouse:manage';
```

Expected: count >= 2 (owner+manager por empresa). Ex.: 6 empresas × 2 roles = 12.

- [ ] **Step 4: Commit:**

```bash
git add supabase/migrations/20260525000065_warehouses_table.sql
git commit -m "feat(inventory): warehouses table + scope dimension seed

PR #G. Tabela warehouses (company_id + code unique). Seed da dimensão
'warehouse' em scope_dimensions. Cria permission core:warehouse:manage
e propaga pra owner + manager templates + instâncias.
RLS: select via company membership; write via core:warehouse:manage."
```

---

## Task 3: Migration 066 — products.warehouse_id + RLS + trigger

**Files:**

- Create: `supabase/migrations/20260525000066_products_warehouse_scoping.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000066_products_warehouse_scoping.sql
-- PR #G: products.warehouse_id (nullable) + RLS atualizada + trigger
-- valida write. Produtos sem warehouse_id (NULL) permanecem acessíveis
-- sem scope check (backward-compat).

alter table public.products
  add column warehouse_id uuid references public.warehouses(id) on delete set null;

create index idx_products_warehouse on public.products(warehouse_id);

comment on column public.products.warehouse_id is
  'PR #G: dimensão warehouse para scope filtering. NULL = produto sem dimensão (acessível por todos).';

-- ─── RLS atualizada ──────────────────────────────────────────────────────────
-- products_select: incluir scope check além de has_permission
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select using (
    public.is_platform_admin()
    or (
      company_id in (select public.user_company_ids())
      and public.has_permission(company_id, 'inventory:product:read')
      and (
        warehouse_id is null
        or public.user_has_scope(company_id, 'warehouse', warehouse_id::text)
      )
    )
  );

-- ─── Trigger: valida write fora do scope ─────────────────────────────────────
create or replace function public.check_product_warehouse_scope()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.warehouse_id is not null
     and not public.user_has_scope(new.company_id, 'warehouse', new.warehouse_id::text)
  then
    raise exception 'Sem acesso ao depósito informado' using errcode = 'P0403';
  end if;
  return new;
end $$;

create trigger trg_product_warehouse_scope
  before insert or update of warehouse_id on public.products
  for each row execute function public.check_product_warehouse_scope();

comment on function public.check_product_warehouse_scope() is
  'PR #G: bloqueia INSERT/UPDATE em warehouse_id fora do scope do user.';
```

- [ ] **Step 2: Aplicar via MCP** (`name: products_warehouse_scoping`).

- [ ] **Step 3: Validar:**

```sql
-- coluna existe?
select column_name from information_schema.columns
where table_schema='public' and table_name='products' and column_name='warehouse_id';
```

Expected: 1 row.

```sql
-- policy recreated?
select policyname, qual from pg_policies
where tablename='products' and policyname='products_select';
```

Expected: 1 row, qual contém `user_has_scope`.

```sql
-- trigger criado?
select tgname from pg_trigger where tgname='trg_product_warehouse_scope';
```

Expected: 1 row.

- [ ] **Step 4: Commit:**

```bash
git add supabase/migrations/20260525000066_products_warehouse_scoping.sql
git commit -m "feat(inventory): products.warehouse_id + scoped RLS + write trigger

PR #G. Products ganha warehouse_id nullable + index. RLS de read filtra
via user_has_scope quando warehouse_id IS NOT NULL (backward-compat:
NULL = sem dimensão, acessível). Trigger BEFORE INSERT/UPDATE bloqueia
write em warehouse fora do scope com P0403."
```

---

## Task 4: TS — Backend warehouse + role-scopes

**Files:**

- Create: `src/modules/inventory/schemas/warehouse.ts`
- Create: `src/modules/inventory/queries/list-warehouses.ts`
- Create: `src/modules/inventory/actions/create-warehouse.ts`
- Create: `src/modules/inventory/actions/update-warehouse.ts`
- Create: `src/modules/inventory/actions/toggle-warehouse-active.ts`
- Modify: `src/modules/inventory/index.ts` (barrel)
- Create: `src/modules/tenancy/queries/list-role-scopes.ts`
- Create: `src/modules/tenancy/actions/update-role-scopes.ts`
- Modify: `src/modules/tenancy/index.ts` (barrel)

### Step 1: Regen types

Via MCP `generate_typescript_types`. Sobrescrever `src/types/database.types.ts`.

### Step 2: Warehouse backend

`src/modules/inventory/schemas/warehouse.ts`:

```ts
import { z } from "zod";

export const warehouseCreateSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[a-z0-9_-]+$/i),
  name: z.string().min(2).max(100),
});

export const warehouseUpdateSchema = warehouseCreateSchema.omit({ code: true });

export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>;
export type WarehouseUpdateInput = z.infer<typeof warehouseUpdateSchema>;
```

`list-warehouses.ts`:

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Warehouse = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
};

export async function listWarehouses(companyId: string): Promise<Warehouse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("warehouses")
    .select("id, code, name, is_active")
    .eq("company_id", companyId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((w) => ({
    id: w.id,
    code: w.code,
    name: w.name,
    isActive: w.is_active,
  }));
}
```

`create-warehouse.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { warehouseCreateSchema } from "../schemas/warehouse";

export async function createWarehouseAction(
  companyId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:warehouse:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar depósitos" };
  }

  const parsed = warehouseCreateSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("warehouses").insert({
    company_id: companyId,
    code: parsed.data.code,
    name: parsed.data.name,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, message: "Code já existe nesta empresa" };
    return { ok: false, message: error.message };
  }

  await audit({
    companyId,
    action: "warehouse.create",
    resourceType: "warehouse",
    resourceId: parsed.data.code,
    status: "success",
  });
  revalidatePath(`/[companySlug]/settings/warehouses`, "page");
  return { ok: true, message: "Depósito criado" };
}
```

`update-warehouse.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";
import { warehouseUpdateSchema } from "../schemas/warehouse";

export async function updateWarehouseAction(
  companyId: string,
  warehouseId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:warehouse:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar depósitos" };
  }

  const parsed = warehouseUpdateSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("warehouses")
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", warehouseId)
    .eq("company_id", companyId);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId,
    action: "warehouse.update",
    resourceType: "warehouse",
    resourceId: warehouseId,
    status: "success",
  });
  revalidatePath(`/[companySlug]/settings/warehouses`, "page");
  return { ok: true, message: "Depósito atualizado" };
}
```

`toggle-warehouse-active.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";

export async function toggleWarehouseActiveAction(
  companyId: string,
  warehouseId: string,
  isActive: boolean,
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:warehouse:manage");
  } catch {
    return { ok: false, message: "Sem permissão" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("warehouses")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", warehouseId)
    .eq("company_id", companyId);

  if (error) return { ok: false, message: error.message };

  await audit({
    companyId,
    action: isActive ? "warehouse.activate" : "warehouse.deactivate",
    resourceType: "warehouse",
    resourceId: warehouseId,
    status: "success",
  });
  revalidatePath(`/[companySlug]/settings/warehouses`, "page");
  return { ok: true, message: isActive ? "Depósito ativado" : "Depósito desativado" };
}
```

Atualizar `src/modules/inventory/index.ts` (barrel) — adicionar exports das queries + actions.

### Step 3: Role-scopes backend

`src/modules/tenancy/queries/list-role-scopes.ts`:

```ts
import "server-only";
import { createClient } from "@/lib/supabase/server";

export type RoleScopeRow = {
  dimensionCode: string;
  scopeValue: string;
};

export type RoleScopesByDimension = Record<string, string[]>;

export async function listRoleScopes(roleId: string): Promise<RoleScopesByDimension> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("role_scopes")
    .select("dimension_code, scope_value")
    .eq("role_id", roleId);
  if (error) throw error;

  const grouped: RoleScopesByDimension = {};
  for (const row of data ?? []) {
    if (!grouped[row.dimension_code]) grouped[row.dimension_code] = [];
    grouped[row.dimension_code]!.push(row.scope_value);
  }
  return grouped;
}
```

`src/modules/tenancy/actions/update-role-scopes.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type ActionResult } from "@/lib/errors";
import { requirePermission } from "@/modules/authz";
import { audit } from "@/modules/audit";

export async function updateRoleScopesAction(
  companyId: string,
  roleId: string,
  dimensionCode: string,
  scopeValues: string[], // empty = irrestrito
): Promise<ActionResult> {
  try {
    await requirePermission(companyId, "core:role:manage");
  } catch {
    return { ok: false, message: "Sem permissão para gerenciar roles" };
  }

  const supabase = await createClient();

  // 1. Valida que role pertence à company
  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("id", roleId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!role) return { ok: false, message: "Role não encontrada" };

  // 2. Delete scopes atuais da dimensão
  const { error: delErr } = await supabase
    .from("role_scopes")
    .delete()
    .eq("role_id", roleId)
    .eq("dimension_code", dimensionCode);
  if (delErr) return { ok: false, message: delErr.message };

  // 3. Insert novos (se houver)
  if (scopeValues.length > 0) {
    const { error: insErr } = await supabase.from("role_scopes").insert(
      scopeValues.map((v) => ({
        role_id: roleId,
        dimension_code: dimensionCode,
        scope_value: v,
      })),
    );
    if (insErr) return { ok: false, message: insErr.message };
  }

  await audit({
    companyId,
    action: "role.scopes_update",
    resourceType: "role",
    resourceId: roleId,
    status: "success",
    metadata: { dimensionCode, scopeValues },
  });

  revalidatePath(`/[companySlug]/settings/roles/${roleId}`, "page");
  return { ok: true, message: "Escopo atualizado" };
}
```

Atualizar `src/modules/tenancy/index.ts` (barrel) — adicionar exports.

### Step 4: Typecheck + tests

```bash
npm run typecheck && npx vitest run --dir src 2>&1 | tail -5
```

Expected: zero erros, tests pass.

### Step 5: Commit

```bash
git add src/types/database.types.ts \
        src/modules/inventory/ \
        src/modules/tenancy/queries/list-role-scopes.ts \
        src/modules/tenancy/actions/update-role-scopes.ts \
        src/modules/tenancy/index.ts
git commit -m "feat(inventory,tenancy): warehouse CRUD + role-scopes backend

PR #G. Inventory ganha warehouse CRUD (Zod + 3 actions + 1 query).
Tenancy ganha list-role-scopes + update-role-scopes (replace-mode
por dimensão, gateado por core:role:manage). Types regenerados."
```

---

## Task 5: UI — Warehouses CRUD + scope aba em role detail

**Files:**

- Create: `src/app/(dashboard)/[companySlug]/settings/warehouses/page.tsx`
- Create: `src/app/(dashboard)/[companySlug]/settings/warehouses/warehouse-form-dialog.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx` (add Tabs com aba Escopo)
- Create: `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/role-scopes-form.tsx`
- Modify: `src/core/navigation/menu.ts` (link warehouses no settings sidebar)

### Step 1: `/[companySlug]/settings/warehouses/page.tsx`

Server Component que lista warehouses + botão "Novo depósito" + tabela com toggle active. Reutilize patterns existentes (similar a roles/page.tsx).

### Step 2: `warehouse-form-dialog.tsx`

Client Component com Dialog + form (code + name) usando useActionState. Suporta create e edit. Code disabled em edit mode.

### Step 3: Adicionar aba "Escopo" em `[roleId]/page.tsx`

Atualmente é uma page simples? Ler primeiro. Se já tem Tabs (de templates), adicionar aba "Escopo". Senão, refatorar com Tabs.

Conteúdo da aba: chama `listRoleScopes(roleId)` + `listWarehouses(companyId)`. Renderiza `RoleScopesForm`.

### Step 4: `role-scopes-form.tsx`

Client Component. Para cada dimensão (começa só com 'warehouse'): checkbox "Irrestrito" + multi-select de warehouses. Toggle "Irrestrito" → desabilita checkboxes + envia array vazio (= irrestrito). Save chama `updateRoleScopesAction(companyId, roleId, "warehouse", selectedValues)`.

Layout sketch:

```tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateRoleScopesAction } from "@/modules/tenancy/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type Props = {
  companyId: string;
  roleId: string;
  warehouses: Array<{ id: string; name: string; code: string }>;
  currentScopes: string[]; // empty = irrestrito
};

export function RoleScopesForm({ companyId, roleId, warehouses, currentScopes }: Props) {
  const [unrestricted, setUnrestricted] = useState(currentScopes.length === 0);
  const [selected, setSelected] = useState<Set<string>>(new Set(currentScopes));
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    setIsPending(true);
    const values = unrestricted ? [] : Array.from(selected);
    const r = await updateRoleScopesAction(companyId, roleId, "warehouse", values);
    setIsPending(false);
    if (r.ok) toast.success(r.message ?? "Salvo");
    else toast.error(r.message ?? "Erro");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded border p-3">
        <h3 className="text-sm font-semibold">Depósitos (warehouse)</h3>
        <p className="text-xs text-muted-foreground">
          Sem nenhum selecionado = role tem acesso a TODOS os depósitos (irrestrito).
        </p>

        <div className="flex items-center gap-2">
          <Checkbox
            id="unrestricted"
            checked={unrestricted}
            onCheckedChange={(v) => setUnrestricted(v === true)}
          />
          <Label htmlFor="unrestricted">Sem restrição (acesso a todos)</Label>
        </div>

        <div className={unrestricted ? "pointer-events-none opacity-50" : ""}>
          {warehouses.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              Nenhum depósito cadastrado. Crie em Configurações → Depósitos.
            </p>
          ) : (
            <div className="grid gap-2">
              {warehouses.map((w) => (
                <div key={w.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`wh-${w.id}`}
                    checked={selected.has(w.id)}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      if (v === true) next.add(w.id);
                      else next.delete(w.id);
                      setSelected(next);
                    }}
                  />
                  <Label htmlFor={`wh-${w.id}`} className="font-normal">
                    {w.name}{" "}
                    <span className="font-mono text-xs text-muted-foreground">{w.code}</span>
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar escopo"}
      </Button>
    </div>
  );
}
```

### Step 5: Adicionar action ao `tenancy/client.ts` (se ainda não)

```ts
export { updateRoleScopesAction } from "./actions/update-role-scopes";
```

### Step 6: Sidebar

Em `src/core/navigation/menu.ts`, adicionar entry pra "Depósitos" → `/[companySlug]/settings/warehouses` no menu de settings. Icon: `warehouse` ou `package`.

### Step 7: Typecheck + lint

```bash
npm run typecheck && npm run lint
```

Expected: zero erros + lint pass.

### Step 8: Commit

```bash
git add 'src/app/(dashboard)/[companySlug]/settings/warehouses/' \
        'src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/' \
        src/core/navigation/menu.ts \
        src/modules/tenancy/client.ts
git commit -m "feat(ui): warehouses CRUD + scope aba em role detail

PR #G. /settings/warehouses lista + dialog create/edit + toggle active.
/settings/roles/[id] ganha aba Escopo com form de warehouse scoping
(checkbox irrestrito + multi-select). Sidebar link adicionado."
```

---

## Task 6: Push + PR

- [ ] Push:

```bash
git push -u origin feat/role-scopes
```

- [ ] PR base=feat/roles-evolution. Summary completo + checklist DB/TS/manual.

- [ ] Manual:
  - Como owner em company X: criar 2 warehouses (W1, W2)
  - Criar role custom "Operador W1" → aba Escopo → desmarcar irrestrito + selecionar W1 → save
  - Atribuir a um operator user
  - Logar como esse user → criar produto em /inventory → tentar setar warehouse_id=W2 → trigger bloqueia (P0403)
  - Mesmo user lista produtos: vê apenas com warehouse_id=NULL OU =W1
  - Owner cria produto com warehouse_id=W2 → sucesso (irrestrito)

---

## Self-Review

- Spec coverage Fase 3: 2 tabelas globais + warehouses + helpers + RLS products + trigger + UI ✓.
- Placeholders: zero TBD/TODO.
- Backward compat: products.warehouse_id NULL = sem dimensão = acessível. Roles sem scope = irrestritas.
- Risk: trigger BEFORE INSERT/UPDATE em products adiciona overhead. Mitigar com index em (warehouse_id) + helper STABLE.
- Rollback: drop tables/columns/triggers reversíveis.

## YAGNI (fora desta PR)

- Outras dimensões (branch, cost_center) — quando demanda real.
- Scoping em stock_movements, kb_articles, etc. — PRs follow-up.
- Templates ganham scopes default (template_scopes table) — futuro.
- UI de admin platform para listar scope_dimensions disponíveis.
- Soft-delete de warehouses (toggle active basta).
- Resolver_fn no scope_dimensions (campo reservado mas não usado nesta PR).
