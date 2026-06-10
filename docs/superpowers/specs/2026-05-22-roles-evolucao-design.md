# Evolução do modelo de Roles & Permissões

**Data:** 2026-05-22
**Status:** Spec aprovada — pronta para writing-plans
**Autor:** Yuri + Claude (brainstorming)

## Contexto

O modelo RBAC atual (`memberships → membership_roles → roles → role_permissions → permissions`) foi implementado no início do projeto com 3 roles "system" rígidas (`owner`/`manager`/`operator`) duplicadas por tenant. Análise revelou pontos de fricção que atrapalham escala:

1. **Sem fonte única de verdade** para roles system — perms duplicadas em N empresas, atualização exige RPC que reescreve linha a linha.
2. **`is_platform_admin()` não está embutido em `has_permission()`** — toda RLS precisa lembrar de `OR is_platform_admin()`. Falha silenciosa (RLS retorna 0 rows) quando esquecido.
3. **`is_owner` boolean coexiste com role `owner`** — duas verdades, proteção contra escalada vive só em TS após migration 034 (recursão RLS).
4. **Sem hierarquia** entre roles — manager gerencia membros igual operator gerencia produtos.
5. **Sem scoping** — permissão é binária por tenant (não há "edita só produtos do depósito SP").
6. **Sem field-level** — não há "vê produto mas não vê custo".
7. **Adicionar módulo exige migration manual** propagando perms por `r.code` em cada role; drift fácil; falha silenciosa.

## Objetivos

- Templates globais como fonte única; instâncias por tenant podem divergir, mas a divergência é explícita.
- Hierarquia opcional de roles (controla _quem gerencia quem_, não autorização de recurso).
- Scopes dimensionais genéricos (warehouse/filial/cost_center) — backward-compatible (role sem scope = irrestrita).
- Field-level masking via catálogo explícito + trigger autoritário + mascaramento client.
- Hardening: `has_permission()` absorve platform admin; `is_owner` morre; cleanup automático de perms em módulo desabilitado; helper genérico para bootstrap de módulo novo.
- Preservar multi-tenant por usuário com roles distintas em cada tenant.

## Não-objetivos

- Deny rules.
- Ownership criteria (`created_by`).
- External authz service (OpenFGA/Cerbos).
- Time-based / IP-based authz.
- ABAC puro (predicados dinâmicos).

## Arquitetura

```
┌─ GLOBAL ─────────────────────────────┐
│ role_templates                       │
│   └── template_permissions           │
│ platform_roles                       │
│   └── platform_role_assignments      │
│ scope_dimensions                     │
│ field_catalog                        │
│ modules / permissions                │
└──────────────────────────────────────┘
            │ "apply template"
            ▼
┌─ POR TENANT ─────────────────────────┐
│ roles                                │
│   ├── parent_role_id  (hierarquia)   │
│   ├── template_code   (proveniência) │
│   ├── role_permissions (is_active)   │
│   ├── role_scopes      ← NOVO        │
│   └── role_field_rules ← NOVO        │
│ memberships → membership_roles       │
│ warehouses (e outras dimensões)      │
└──────────────────────────────────────┘
```

**Princípios:**

- **Template ≠ instância.** Sincronização explícita; tenant que customiza fica órfão até reset manual.
- **Hierarquia opcional.** Sem `parent_role_id` = flat (default atual).
- **Scopes aditivos.** Role sem `role_scopes(dim=X)` = irrestrita em X.
- **Field-rules aditivas.** Coluna sem regra = `editable`.
- **RLS continua autoridade.** Helpers `security definer` chamados das policies.
- **Owner = role pura.** Sem boolean duplicado.

## Fase 1 — Templates globais + instâncias por tenant

### Schema

```sql
create table public.role_templates (
  code         text primary key,
  name         text not null,
  description  text,
  is_system    boolean not null default false,
  sort_order   int not null default 100,
  created_at   timestamptz default now()
);

create table public.template_permissions (
  template_code   text references role_templates(code) on delete cascade,
  permission_code text references permissions(code) on delete cascade,
  primary key (template_code, permission_code)
);

alter table public.roles
  add column template_code text references role_templates(code) on delete set null,
  add column template_synced_at timestamptz;
```

### Fluxos

**Bootstrap nova empresa:** `bootstrap_company_rbac` itera `role_templates where is_system`, cria instância vinculada, copia `template_permissions → role_permissions`, marca `template_synced_at = now()`.

**Edição de template (platform admin):**

1. UI em `/admin/platform/role-templates`.
2. Sistema detecta instâncias "in sync" (sem divergência desde último sync).
3. Dry-run mostra empresas alvo + skip de divergentes.
4. RPC `apply_template_to_company(company, template_code)` aplica.

**Divergência:** tenant edita `role_permissions` → `template_synced_at = null` + flag custom. UI mostra badge "personalizada" + botão "Resetar do template".

### Mata `is_owner`

```sql
-- Garante role owner para todos os is_owner=true
insert into membership_roles (membership_id, role_id)
  select m.id, r.id from memberships m
  join roles r on r.company_id = m.company_id and r.code = 'owner'
  where m.is_owner = true on conflict do nothing;

-- Preserva por 1 release antes do drop final
alter table memberships rename column is_owner to legacy_is_owner;
-- (no PR seguinte) alter table memberships drop column legacy_is_owner;
```

Policies que usavam `is_owner` viram `has_permission(company, 'core:company:update')` ou `exists(membership_roles where role.code='owner')`.

### Migração de dados

```sql
insert into role_templates (code, name, is_system)
  select distinct code, name, true from roles where is_system;

insert into template_permissions (template_code, permission_code)
  select distinct r.code, rp.permission_code
  from roles r join role_permissions rp on rp.role_id = r.id
  where r.is_system;

update roles set template_code = code, template_synced_at = now()
  where is_system;
```

### UI

- Nova rota `/admin/platform/role-templates` (CRUD + apply propagation com dry-run).
- `/admin/platform/roles` atual vira read-only matrix entre empresas.
- `/[companySlug]/settings/roles` ganha badge "Personalizada" + botão reset.
- Remove RPC `update_system_role_permissions` (obsoleta).

## Fase 2 — Hierarquia de roles

### Schema

```sql
alter table public.roles
  add column parent_role_id uuid references roles(id) on delete set null,
  add column hierarchy_level int not null default 0;

create index idx_roles_parent on roles(parent_role_id);
```

### Constraint anti-ciclo

Trigger `check_role_hierarchy` (BEFORE INSERT/UPDATE de `parent_role_id`):

```sql
create or replace function public.check_role_hierarchy()
returns trigger language plpgsql as $$
declare
  v_current uuid := new.parent_role_id;
  v_depth int := 0;
begin
  if new.parent_role_id is null then new.hierarchy_level := 0; return new; end if;
  while v_current is not null loop
    if v_current = new.id then raise exception 'Ciclo detectado' using errcode='P0001'; end if;
    v_depth := v_depth + 1;
    if v_depth > 10 then raise exception 'Profundidade máxima excedida' using errcode='P0001'; end if;
    select parent_role_id into v_current from roles where id = v_current;
  end loop;
  new.hierarchy_level := v_depth;
  return new;
end $$;
```

### Helper

```sql
create or replace function public.can_manage_role(p_company uuid, p_target_role uuid)
returns boolean language sql stable security definer set search_path = public as $$
  with recursive actor_roles as (
    select r.id, r.parent_role_id from memberships m
    join membership_roles mr on mr.membership_id = m.id
    join roles r on r.id = mr.role_id
    where m.user_id = auth.uid() and m.company_id = p_company and m.status = 'active'
  ),
  descendants as (
    select id, parent_role_id from roles
    where parent_role_id in (select id from actor_roles) and company_id = p_company
    union all
    select r.id, r.parent_role_id from roles r
    join descendants d on r.parent_role_id = d.id
    where r.company_id = p_company
  )
  select is_platform_admin() or exists(select 1 from descendants where id = p_target_role);
$$;
```

### Aplicação

1. **Atribuir roles a membros:** UI filtra `availableRoles` server-side; backend valida em `set_member_roles` RPC.
2. **Suspender/remover membro:** actor precisa gerenciar ao menos uma role do target.
3. **Editar role custom:** só edita roles `parent_role_id ∈ minhas_roles_e_descendentes`.

### Semântica explícita

**Hierarquia não propaga permissões.** Manager não herda perms de operator automaticamente. Hierarquia controla _gestão_, perms continuam explícitas. Documentar na UI: "Hierarquia controla gestão, permissões são explícitas".

### Hierarquia default (templates)

```
owner (level 0)
  └─ manager (level 1)
       └─ operator (level 2)
```

`role_templates` ganha `parent_template_code` para propagação.

### Validação no RPC

```sql
-- adicionar em set_member_roles antes do delete/insert:
if exists (
  select 1 from unnest(p_role_ids) rid
  where not can_manage_role(p_company_id, rid)
) then
  raise exception 'Sem permissão para atribuir uma ou mais roles' using errcode = 'P0403';
end if;
```

### UI

- `/[companySlug]/settings/roles` ganha select "Role superior".
- View em árvore (`tree-view`) opcional.
- `member-roles-sheet.tsx` filtra por `can_manage_role()`.

## Fase 3 — Scopes dimensionais

### Schema

```sql
create table public.scope_dimensions (
  code         text primary key,
  name         text not null,
  description  text,
  resolver_fn  text not null,
  created_at   timestamptz default now()
);

create table public.role_scopes (
  role_id        uuid references roles(id) on delete cascade,
  dimension_code text references scope_dimensions(code) on delete restrict,
  scope_value    text not null,
  granted_at     timestamptz default now(),
  primary key (role_id, dimension_code, scope_value)
);
create index idx_role_scopes_role on role_scopes(role_id);
create index idx_role_scopes_dim_value on role_scopes(dimension_code, scope_value);

-- Primeira dimensão concreta
create table public.warehouses (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  code        text not null,
  name        text not null,
  is_active   boolean default true,
  unique (company_id, code)
);
```

### Semântica

- Role sem linhas em `role_scopes(dim=X)` = acesso a TODO X (irrestrito).
- Múltiplas linhas em mesma dimensão = união.
- Múltiplas dimensões = interseção.
- User com N roles = união dos scopes de todas.

### Helpers

```sql
create or replace function public.user_scope_values(p_company uuid, p_dimension text)
returns setof text language plpgsql stable security definer set search_path = public as $$
declare v_has_unrestricted boolean;
begin
  if is_platform_admin() then return query select '*'::text; return; end if;

  select exists (
    select 1 from memberships m
    join membership_roles mr on mr.membership_id = m.id
    where m.user_id = auth.uid() and m.company_id = p_company and m.status = 'active'
      and not exists (
        select 1 from role_scopes rs
        where rs.role_id = mr.role_id and rs.dimension_code = p_dimension
      )
  ) into v_has_unrestricted;

  if v_has_unrestricted then return query select '*'::text; return; end if;

  return query
    select distinct rs.scope_value from memberships m
    join membership_roles mr on mr.membership_id = m.id
    join role_scopes rs on rs.role_id = mr.role_id
    where m.user_id = auth.uid() and m.company_id = p_company and m.status = 'active'
      and rs.dimension_code = p_dimension;
end $$;

create or replace function public.user_has_scope(p_company uuid, p_dimension text, p_value text)
returns boolean language sql stable security definer set search_path = public as $$
  select is_platform_admin()
      or exists(select 1 from user_scope_values(p_company, p_dimension) v
                where v = '*' or v = p_value);
$$;
```

### Aplicação em tabelas

```sql
alter table products add column warehouse_id uuid references warehouses(id);

drop policy "products_select" on products;
create policy "products_select" on products
  for select using (
    is_platform_admin()
    or (
      company_id in (select user_company_ids())
      and has_permission(company_id, 'inventory:product:read')
      and (warehouse_id is null
           or user_has_scope(company_id, 'warehouse', warehouse_id::text))
    )
  );
```

`warehouse_id is null` = produto sem dimensão → acessível (backward-compat).

### Validação na escrita

Trigger BEFORE INSERT/UPDATE valida que user tem scope no warehouse:

```sql
create or replace function public.check_product_warehouse_scope()
returns trigger language plpgsql as $$
begin
  if new.warehouse_id is not null
     and not user_has_scope(new.company_id, 'warehouse', new.warehouse_id::text)
  then raise exception 'Sem acesso ao depósito informado' using errcode = 'P0403';
  end if;
  return new;
end $$;
```

### UI

- `/[companySlug]/settings/scopes` — CRUD de warehouses/filiais.
- `/[companySlug]/settings/roles/[roleId]` ganha aba "Escopo".
- Listagens já vêm filtradas via RLS.

## Fase 4 — Field-level (mascaramento)

### Schema

```sql
create table public.field_catalog (
  table_name   text not null,
  column_name  text not null,
  label        text not null,
  description  text,
  module_code  text references modules(code),
  primary key (table_name, column_name)
);

create table public.role_field_rules (
  role_id      uuid references roles(id) on delete cascade,
  table_name   text not null,
  column_name  text not null,
  mode         text not null check (mode in ('hidden','readonly','editable')),
  primary key (role_id, table_name, column_name)
);
create index idx_field_rules_table on role_field_rules(table_name);
```

### Helper

```sql
create or replace function public.user_field_mode(
  p_company uuid, p_table text, p_column text
) returns text language plpgsql stable security definer set search_path = public as $$
declare v_modes text[];
begin
  if is_platform_admin() then return 'editable'; end if;

  select array_agg(distinct rfr.mode) into v_modes
  from memberships m
  join membership_roles mr on mr.membership_id = m.id
  join role_field_rules rfr on rfr.role_id = mr.role_id
  where m.user_id = auth.uid() and m.company_id = p_company and m.status = 'active'
    and rfr.table_name = p_table and rfr.column_name = p_column;

  if v_modes is null then return 'editable'; end if;
  if 'hidden'   = any(v_modes) then return 'hidden';   end if;
  if 'readonly' = any(v_modes) then return 'readonly'; end if;
  return 'editable';
end $$;

create or replace function public.visible_columns(p_company uuid, p_table text)
returns setof text language sql stable security definer set search_path = public as $$
  select column_name from field_catalog
  where table_name = p_table
    and user_field_mode(p_company, p_table, column_name) <> 'hidden';
$$;
```

### Aplicação — duas camadas

**Camada 1 (autoritária): trigger BEFORE UPDATE.**

```sql
create or replace function public.enforce_field_rules()
returns trigger language plpgsql as $$
declare v_col record; v_mode text; v_company uuid;
begin
  execute format('select ($1).company_id') using new into v_company;
  for v_col in
    select column_name from field_catalog where table_name = TG_TABLE_NAME
  loop
    if to_jsonb(new)->v_col.column_name is distinct from to_jsonb(old)->v_col.column_name then
      v_mode := user_field_mode(v_company, TG_TABLE_NAME, v_col.column_name);
      if v_mode in ('hidden','readonly') then
        raise exception 'Coluna % é somente leitura', v_col.column_name using errcode='P0403';
      end if;
    end if;
  end loop;
  return new;
end $$;

create trigger trg_enforce_field_rules_products
  before update on products
  for each row execute function enforce_field_rules();
```

**Camada 2 (apresentação): mascaramento client.**

```ts
// src/modules/authz/services/field-rules.ts
export async function selectVisible<T>(
  table: string,
  companyId: string,
  baseQuery: any,
): Promise<T[]> {
  const supabase = await createClient();
  const { data: cols } = await supabase.rpc("visible_columns", {
    p_company: companyId,
    p_table: table,
  });
  const colList = (cols ?? []).join(",") || "id";
  return baseQuery.select(colList);
}
```

Hook UI:

```ts
export function useFieldMode(table: string, column: string): "hidden" | "readonly" | "editable" {
  const ctx = useContext(PermissionsContext);
  return ctx.fieldModes[`${table}.${column}`] ?? "editable";
}
```

`PermissionsProvider` ganha bootstrap de `fieldModes` (`field_catalog` + modos por user).

### Por que duas camadas

Trigger garante segurança (não dá pra burlar via PostgREST direto). Mascaramento app é UX/performance (não envia bytes que vão ser escondidos).

### UI

- `/[companySlug]/settings/roles/[roleId]` ganha aba "Campos" listando `field_catalog` por módulo.
- Form de produto usa `useFieldMode` (esconder/disable).
- Listagens com `selectVisible` omitem colunas no select.

### Field-catalog inicial

- `products.cost_price`
- `products.profit_margin`

## Fase 5 — Hardening transversal

### 5.2 — `role_permissions.is_active` (vem PRIMEIRO; PR #A)

```sql
alter table role_permissions add column is_active boolean not null default true;
```

Toggle de módulo desativado → marca `is_active = false` (não deleta). Reativar = `true`. `has_permission` ainda não filtra por isso nesta fase; passa a filtrar no PR #B.

### 5.1 — `has_permission` absorve platform admin (PR #B)

```sql
create or replace function public.has_permission(p_company uuid, p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
      or exists (
        select 1 from public.memberships m
        join public.membership_roles mr on mr.membership_id = m.id
        join public.role_permissions rp on rp.role_id = mr.role_id
        where m.user_id = auth.uid() and m.company_id = p_company
          and m.status = 'active' and rp.permission_code = p_permission
          and rp.is_active = true
      )
$$;
```

Depois disso, **cleanup PR separado** remove `OR is_platform_admin()` redundante das policies.

### 5.3 — Helper genérico para módulo novo

```sql
create or replace function public.grant_module_to_all_companies(
  p_module_code text, p_role_to_perms jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_platform_admin() then raise exception 'Acesso restrito'; end if;

  insert into company_modules (company_id, module_code)
    select id, p_module_code from companies on conflict do nothing;

  insert into role_permissions (role_id, permission_code)
    select r.id, p.code from roles r cross join permissions p
    where p.module_code = p_module_code
      and r.code in (select jsonb_object_keys(p_role_to_perms))
      and (p_role_to_perms -> r.code ? '*' or p_role_to_perms -> r.code ? p.code)
    on conflict do nothing;

  -- também atualiza templates para novos tenants
  insert into template_permissions (template_code, permission_code)
    select t.code, p.code from role_templates t cross join permissions p
    where p.module_code = p_module_code
      and t.code in (select jsonb_object_keys(p_role_to_perms))
      and (p_role_to_perms -> t.code ? '*' or p_role_to_perms -> t.code ? p.code)
    on conflict do nothing;
end $$;
```

Migração de módulo novo vira:

```sql
insert into modules(code, name) values ('billing', 'Faturamento');
insert into permissions(code, module_code, resource, action) values (...);
select grant_module_to_all_companies('billing',
  '{"owner":["*"],"manager":["billing:invoice:read","billing:invoice:create"]}');
```

### 5.4 — `platform_roles` (super-admin granular)

```sql
create table public.platform_roles (
  code text primary key,
  name text not null,
  permissions text[] not null default '{}'
);

create table public.platform_role_assignments (
  user_id uuid references auth.users(id) on delete cascade,
  role_code text references platform_roles(code),
  granted_by uuid, granted_at timestamptz default now(),
  primary key (user_id, role_code)
);

-- is_platform_admin() retrocompat:
create or replace function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from platform_role_assignments pra
    join platform_roles pr on pr.code = pra.role_code
    where pra.user_id = auth.uid()
      and ('*' = any(pr.permissions) or 'platform:*' = any(pr.permissions))
  )
$$;
```

Migração: todo registro em `platform_admins` vira assignment de role `platform_admin` com `permissions=['*']`. Tabela antiga preservada com view por 1 release.

### 5.5 — Audit via trigger

Triggers AFTER INSERT/UPDATE/DELETE em `role_permissions`, `role_scopes`, `role_field_rules`, `membership_roles`, `template_permissions` gravam `audit_logs` automaticamente. Captura mudanças via SQL direto, não só via app.

## Ordem de execução

| Fase | PR  | Conteúdo                                                                                                                       | Risco | Bloqueia      |
| ---- | --- | ------------------------------------------------------------------------------------------------------------------------------ | ----- | ------------- |
| 5.2  | #A  | `role_permissions.is_active` + adapter no toggle (necessário antes do 5.1 pra evitar reescrita do `has_permission` duas vezes) | Baixo | nada          |
| 5.1  | #B  | `has_permission()` absorve `is_platform_admin()` + filtro por `is_active` + cleanup das policies                               | Baixo | #A            |
| 5.3  | #C  | RPC `grant_module_to_all_companies`                                                                                            | Baixo | nada          |
| 1    | #D  | `role_templates` + `template_permissions` + migração system roles; rename `is_owner` → `legacy_is_owner`                       | Médio | toca UI admin |
| 5.4  | #E  | `platform_roles` + assignments; retrocompat                                                                                    | Médio | nada          |
| 2    | #F  | `roles.parent_role_id` + `can_manage_role()`; UI tree                                                                          | Médio | #D            |
| 3    | #G  | `scope_dimensions` + `role_scopes` + warehouses + RLS inventory                                                                | Alto  | #F            |
| 4    | #H  | `field_catalog` + `role_field_rules` + triggers + UI; mascaramento client                                                      | Alto  | #G            |

Princípio: hardening (#A–#C, #E) antes de features grandes — paga dívida primeiro. Cada PR é deployable sozinho.

## Testing

Sem runner hoje. PR #A introduz Vitest:

- **Unit:** `has_permission`, `can_manage_role`, `user_has_scope`, `user_field_mode` via fixtures Supabase local + seed.
- **Integration:** actions de tenancy/authz com matrizes de roles (owner/manager/operator/custom + scoped + field-restricted).
- **Manual checklist** por PR — atualizar `kb-maintainer` e flow-manager docs.

## Rollback

- Tabelas novas vazias = comportamento atual (helpers retornam unrestricted).
- `is_owner` preservado como `legacy_is_owner` por 1 release antes do drop final.
- Cada migration tem reverso documentado no PR.
- PR #D especialmente: snapshot de `role_permissions` antes da migração de templates.

## Performance

- `has_permission`, `can_manage_role`, `user_has_scope`, `user_field_mode` são STABLE → cache por query.
- Indexes: `idx_role_scopes_dim_value`, `idx_field_rules_table`, `idx_roles_parent`.
- `enforce_field_rules` compara `to_jsonb(new) vs to_jsonb(old)` por row — aceitável em CRUD; revisar em bulk ingest.
- `can_manage_role` usa CTE recursiva — chamado em pontos específicos (atribuição), não em RLS quente.

## YAGNI (explicitamente fora)

- Deny rules.
- Ownership criteria.
- External authz service.
- Time-based / IP-based.
- Multi-region scopes (modelo permite extensão futura sem schema novo).
- ABAC puro (predicados dinâmicos).
- Field-level com hierarquia/herança (mantém explícito por role).
