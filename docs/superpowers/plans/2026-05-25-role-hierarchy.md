# PR #F — Hierarquia de roles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar hierarquia opcional entre roles (`parent_role_id`). Controla _quem gerencia quem_, NÃO propaga permissões. Default flat — só usa quem quer. Templates ganham `parent_template_code`; bootstrap propaga hierarquia default `owner → manager → operator`.

**Architecture:**

- 2 colunas em `roles`: `parent_role_id` (self-ref nullable) + `hierarchy_level` (denormalizado via trigger).
- 1 coluna em `role_templates`: `parent_template_code` (self-ref).
- Trigger anti-ciclo (max depth 10).
- Helper `can_manage_role(company, target)` via CTE recursiva.
- `set_member_roles` RPC valida `can_manage_role` antes de atribuir.
- Bootstrap reescrita: 2-pass (cria roles, depois popula `parent_role_id`).
- UI: select "Role superior" em create/edit role; filtragem em member-roles-sheet.

**Tech Stack:** Supabase Postgres · plpgsql · CTE recursiva · TS Server Actions · Shadcn Select.

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção "Fase 2".

**Depende de:** PRs #A–#E (em `feat/roles-evolution`).

**Não inclui:**

- View em árvore (`tree-view`) opcional para roles — deferred se houver demanda.
- Drop `legacy_is_owner` — D2-followup.
- Fases 3-4 (scopes, field-level) — #G, #H.
- Propagação de permissões via hierarquia — spec proíbe explicitamente.

---

## File Structure

| Arquivo                                                                              | Responsabilidade                                                | Ação       |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ---------- |
| `supabase/migrations/20260525000060_roles_hierarchy_schema.sql`                      | Colunas + trigger anti-ciclo                                    | CREATE     |
| `supabase/migrations/20260525000061_template_hierarchy_schema_and_seed.sql`          | parent_template_code + hierarquia default + backfill instâncias | CREATE     |
| `supabase/migrations/20260525000062_can_manage_role_and_update_set_member_roles.sql` | Helper + RPC update                                             | CREATE     |
| `supabase/migrations/20260525000063_bootstrap_with_hierarchy.sql`                    | Bootstrap reescrita 2-pass                                      | CREATE     |
| `src/types/database.types.ts`                                                        | Regen                                                           | REGENERATE |
| `src/modules/tenancy/queries/list-company-roles.ts`                                  | Retornar parentRoleId + hierarchyLevel                          | MODIFY     |
| `src/modules/tenancy/queries/list-manageable-roles.ts`                               | Roles que actor pode gerenciar                                  | CREATE     |
| `src/modules/tenancy/schemas/role.ts` (se existir) ou `actions/create-role.ts`       | Aceitar parent_role_id em forms                                 | MODIFY     |
| `src/modules/tenancy/actions/create-role.ts`                                         | parent_role_id no insert                                        | MODIFY     |
| `src/modules/tenancy/actions/update-role.ts`                                         | parent_role_id no update                                        | MODIFY     |
| `src/app/(dashboard)/[companySlug]/settings/roles/role-form.tsx`                     | Select de parent                                                | MODIFY     |
| `src/app/(dashboard)/[companySlug]/settings/roles/page.tsx`                          | Passar parents pro form                                         | MODIFY     |
| `src/app/(dashboard)/[companySlug]/settings/members/member-roles-sheet.tsx`          | Filtrar availableRoles via can_manage_role                      | MODIFY     |
| `src/modules/tenancy/index.ts`                                                       | Barrel                                                          | MODIFY     |

---

## Pre-requisite: branch setup

- [ ] **Step 0: Branch from `feat/roles-evolution`**

```bash
git checkout feat/roles-evolution
git pull
git checkout -b feat/role-hierarchy
```

---

## Task 1: Migration 060 — Schema + trigger anti-ciclo

**Files:**

- Create: `supabase/migrations/20260525000060_roles_hierarchy_schema.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000060_roles_hierarchy_schema.sql
-- PR #F da evolução de roles: hierarquia opcional entre roles via
-- parent_role_id (self-ref). hierarchy_level mantido via trigger.
-- Controla 'quem gerencia quem'; NÃO propaga permissões.

alter table public.roles
  add column parent_role_id uuid references public.roles(id) on delete set null,
  add column hierarchy_level int not null default 0;

create index idx_roles_parent on public.roles(parent_role_id);

comment on column public.roles.parent_role_id is
  'PR #F: role pai na hierarquia. NULL = flat. Hierarquia controla gestão (can_manage_role), não autorização de recurso.';
comment on column public.roles.hierarchy_level is
  'PR #F: denormalizado via trigger. 0 = raiz; aumenta a cada nível. Max 10.';

-- Trigger anti-ciclo + auto-set hierarchy_level
create or replace function public.check_role_hierarchy()
returns trigger
language plpgsql as $$
declare
  v_current uuid := new.parent_role_id;
  v_depth int := 0;
begin
  if new.parent_role_id is null then
    new.hierarchy_level := 0;
    return new;
  end if;

  -- Parent precisa estar na mesma empresa
  if not exists (
    select 1 from public.roles r
    where r.id = new.parent_role_id and r.company_id = new.company_id
  ) then
    raise exception 'parent_role_id deve referenciar role na mesma empresa' using errcode = 'P0001';
  end if;

  while v_current is not null loop
    if v_current = new.id then
      raise exception 'Ciclo detectado em hierarquia de roles' using errcode = 'P0001';
    end if;
    v_depth := v_depth + 1;
    if v_depth > 10 then
      raise exception 'Profundidade máxima de hierarquia excedida (10)' using errcode = 'P0001';
    end if;
    select parent_role_id into v_current from public.roles where id = v_current;
  end loop;

  new.hierarchy_level := v_depth;
  return new;
end $$;

create trigger trg_check_role_hierarchy
  before insert or update of parent_role_id on public.roles
  for each row execute function public.check_role_hierarchy();

comment on function public.check_role_hierarchy() is
  'PR #F: valida parent_role_id (mesma empresa, sem ciclo, max depth 10) e seta hierarchy_level automaticamente.';
```

- [ ] **Step 2: Aplicar via MCP** (`name: roles_hierarchy_schema`).

- [ ] **Step 3: Validar via SQL:**

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='roles'
  and column_name in ('parent_role_id','hierarchy_level');
```

Expected: 2 rows. `parent_role_id uuid YES`, `hierarchy_level integer NO default 0`.

```sql
select tgname from pg_trigger where tgname = 'trg_check_role_hierarchy';
```

Expected: 1 row.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525000060_roles_hierarchy_schema.sql
git commit -m "feat(authz): roles.parent_role_id + hierarchy_level + anti-cycle trigger

PR #F da evolução de roles. Adiciona hierarquia opcional via self-ref.
Trigger valida: parent na mesma empresa, sem ciclo, max depth 10.
hierarchy_level auto-computado. NÃO propaga permissões — controla gestão."
```

---

## Task 2: Migration 061 — Template hierarchy + backfill

**Files:**

- Create: `supabase/migrations/20260525000061_template_hierarchy_schema_and_seed.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000061_template_hierarchy_schema_and_seed.sql
-- PR #F: role_templates ganha parent_template_code. Default hierarchy:
-- owner → manager → operator. Backfill aplica parent_role_id nas
-- instâncias existentes baseado no template.

alter table public.role_templates
  add column parent_template_code text references public.role_templates(code) on delete set null;

comment on column public.role_templates.parent_template_code is
  'PR #F: template pai. Bootstrap propaga essa estrutura para parent_role_id em instâncias.';

-- Seed da hierarquia default: owner > manager > operator
update public.role_templates set parent_template_code = 'owner' where code = 'manager';
update public.role_templates set parent_template_code = 'manager' where code = 'operator';

-- Backfill: aplica parent_role_id nas instâncias existentes
-- Para cada role com template_code definido, busca o parent_template_code,
-- encontra a role correspondente na MESMA empresa, e seta parent_role_id.
update public.roles target
set parent_role_id = parent_role.id
from public.role_templates tpl
join public.roles parent_role
  on parent_role.code = tpl.parent_template_code
  and parent_role.company_id = target.company_id
where target.template_code = tpl.code
  and tpl.parent_template_code is not null
  and target.parent_role_id is null;
```

- [ ] **Step 2: Aplicar via MCP** (`name: template_hierarchy_schema_and_seed`).

- [ ] **Step 3: Validar via SQL:**

```sql
select code, parent_template_code from role_templates order by sort_order;
```

Expected: `owner null, manager owner, operator manager`.

```sql
-- Quantas instâncias receberam parent_role_id?
select count(*) as with_parent from roles where parent_role_id is not null;
-- Roles que deveriam ter (manager + operator de cada empresa):
select count(*) as expected
from roles where code in ('manager','operator') and is_system;
```

Expected: `with_parent ≈ expected` (modulo casos edge — alguns tenants podem não ter manager/operator).

```sql
-- hierarchy_level foi auto-computado?
select code, count(*) as instances, count(*) filter (where hierarchy_level > 0) as with_level
from roles where is_system group by code;
```

Expected: owner level=0; manager+operator level>0 onde tem parent.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525000061_template_hierarchy_schema_and_seed.sql
git commit -m "feat(authz): template hierarchy + backfill parent_role_id

PR #F. role_templates ganha parent_template_code. Hierarquia default:
owner > manager > operator. Backfill aplica parent_role_id nas
instâncias existentes baseado no template, e trigger 060 auto-computa
hierarchy_level."
```

---

## Task 3: Migration 062 — `can_manage_role` + update `set_member_roles`

**Files:**

- Create: `supabase/migrations/20260525000062_can_manage_role_and_update_set_member_roles.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000062_can_manage_role_and_update_set_member_roles.sql
-- PR #F: helper can_manage_role + atualização do RPC set_member_roles
-- para validar a hierarquia antes de atribuir.

-- Helper: actor pode gerenciar target_role?
-- Regra: target é descendente (transitivo) de alguma role do actor, OU actor
-- é platform admin. Roles sem parent (flat) só são "gerenciáveis" por quem
-- tem perm core:role:manage E também é membership_role do mesmo company —
-- mas neste helper focamos só na hierarquia. A perm geral é checada pela
-- policy/RPC caller.
create or replace function public.can_manage_role(p_company uuid, p_target_role uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  with recursive actor_roles as (
    select r.id, r.parent_role_id, r.company_id
    from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.roles r on r.id = mr.role_id
    where m.user_id = auth.uid()
      and m.company_id = p_company
      and m.status = 'active'
  ),
  descendants as (
    select id, parent_role_id from public.roles
    where parent_role_id in (select id from actor_roles)
      and company_id = p_company
    union all
    select r.id, r.parent_role_id from public.roles r
    join descendants d on r.parent_role_id = d.id
    where r.company_id = p_company
  )
  select public.is_platform_admin()
      or exists(select 1 from descendants where id = p_target_role);
$$;

comment on function public.can_manage_role(uuid, uuid) is
  'PR #F: actor pode gerenciar target_role? True se platform admin OU target é descendente transitivo de alguma role do actor. Hierarquia controla gestão, não autorização.';

-- Atualizar set_member_roles para validar can_manage_role para cada role
-- antes do delete/insert.
create or replace function public.set_member_roles(
  p_company_id    uuid,
  p_membership_id uuid,
  p_role_ids      uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_permission(p_company_id, 'core:member:manage') then
    raise exception 'Sem permissão para gerenciar membros' using errcode = 'P0401';
  end if;

  if not exists (
    select 1 from public.memberships
    where id = p_membership_id and company_id = p_company_id
  ) then
    raise exception 'Membro não encontrado' using errcode = 'P0404';
  end if;

  if array_length(p_role_ids, 1) > 0 then
    -- Validar que todas as roles são da empresa
    if exists (
      select 1 from unnest(p_role_ids) rid
      where not exists (
        select 1 from public.roles r
        where r.id = rid and r.company_id = p_company_id
      )
    ) then
      raise exception 'Uma ou mais roles são inválidas' using errcode = 'P0422';
    end if;

    -- PR #F: validar que actor pode gerenciar cada role na hierarquia
    if exists (
      select 1 from unnest(p_role_ids) rid
      where not public.can_manage_role(p_company_id, rid)
    ) then
      raise exception 'Sem permissão hierárquica para atribuir uma ou mais roles'
        using errcode = 'P0403';
    end if;
  end if;

  delete from public.membership_roles where membership_id = p_membership_id;

  if array_length(p_role_ids, 1) > 0 then
    insert into public.membership_roles (membership_id, role_id)
    select p_membership_id, rid from unnest(p_role_ids) rid;
  end if;
end $$;
```

- [ ] **Step 2: Aplicar via MCP** (`name: can_manage_role_and_update_set_member_roles`).

- [ ] **Step 3: Validar:**

```sql
select proname from pg_proc where proname in ('can_manage_role','set_member_roles')
  and pronamespace = (select oid from pg_namespace where nspname = 'public');
```

Expected: 2 rows.

```sql
select prosrc from pg_proc where proname = 'set_member_roles'
  and pronamespace = (select oid from pg_namespace where nspname = 'public');
```

Expected: prosrc contém `can_manage_role` e a verificação `Sem permissão hierárquica`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525000062_can_manage_role_and_update_set_member_roles.sql
git commit -m "feat(authz): can_manage_role helper + set_member_roles enforces hierarchy

PR #F. Function can_manage_role usa CTE recursiva (platform admin OU
target é descendente do actor). set_member_roles RPC valida toda role
antes de atribuir; falha com P0403 se hierarquia bloqueia."
```

---

## Task 4: Migration 063 — Bootstrap 2-pass

**Files:**

- Create: `supabase/migrations/20260525000063_bootstrap_with_hierarchy.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000063_bootstrap_with_hierarchy.sql
-- PR #F: reescreve bootstrap_company_rbac com 2-pass. Pass 1 cria roles
-- (sem parent); pass 2 popula parent_role_id baseado em parent_template_code.

create or replace function public.bootstrap_company_rbac(p_company uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tpl record;
  v_role_id uuid;
begin
  -- Pass 1: criar/atualizar todas as roles a partir dos templates
  for v_tpl in
    select code, name from public.role_templates where is_system order by sort_order
  loop
    insert into public.roles (company_id, code, name, is_system, template_code, template_synced_at)
      values (p_company, v_tpl.code, v_tpl.name, true, v_tpl.code, now())
      on conflict (company_id, code) do update
        set template_code = excluded.template_code,
            template_synced_at = now()
      returning id into v_role_id;

    if v_role_id is null then
      select id into v_role_id
      from public.roles
      where company_id = p_company and code = v_tpl.code;
    end if;

    insert into public.role_permissions (role_id, permission_code, is_active)
      select v_role_id, tp.permission_code, true
      from public.template_permissions tp
      join public.permissions p on p.code = tp.permission_code
      where tp.template_code = v_tpl.code
        and (
          p.module_code = 'core'
          or p.module_code in (
            select module_code from public.company_modules where company_id = p_company
          )
        )
      on conflict do nothing;
  end loop;

  -- Pass 2: popular parent_role_id baseado em parent_template_code
  update public.roles target
  set parent_role_id = parent_role.id
  from public.role_templates tpl
  join public.roles parent_role
    on parent_role.code = tpl.parent_template_code
    and parent_role.company_id = target.company_id
  where target.template_code = tpl.code
    and target.company_id = p_company
    and tpl.parent_template_code is not null
    and target.parent_role_id is distinct from parent_role.id;
end $$;

comment on function public.bootstrap_company_rbac(uuid) is
  'PR #F: 2-pass — Pass 1 cria roles + perms; Pass 2 popula parent_role_id via parent_template_code.';
```

- [ ] **Step 2: Aplicar via MCP** (`name: bootstrap_with_hierarchy`).

- [ ] **Step 3: Validar:**

```sql
select prosrc from pg_proc where proname = 'bootstrap_company_rbac'
  and pronamespace = (select oid from pg_namespace where nspname = 'public');
```

Expected: prosrc contém "Pass 1", "Pass 2", "parent_role_id".

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525000063_bootstrap_with_hierarchy.sql
git commit -m "feat(authz): bootstrap_company_rbac 2-pass para parent_role_id

PR #F. Pass 1 cria roles + perms (lógica existente). Pass 2 popula
parent_role_id em cada role baseado no parent_template_code do template
correspondente. Empresas novas ganham hierarquia automaticamente."
```

---

## Task 5: TS — Queries + actions atualizadas

**Files:**

- Modify: `src/modules/tenancy/queries/list-company-roles.ts` (incluir parentRoleId, hierarchyLevel)
- Create: `src/modules/tenancy/queries/list-manageable-roles.ts` (roles que actor pode gerenciar)
- Modify: `src/modules/tenancy/actions/create-role.ts` (aceitar parent_role_id)
- Modify: `src/modules/tenancy/actions/update-role.ts` (aceitar parent_role_id)
- Modify: `src/modules/tenancy/index.ts` (barrel)

### Step 1: Regen types primeiro

`mcp__claude_ai_Supabase__generate_typescript_types` → escrever em `src/types/database.types.ts`.

### Step 2: Atualizar `list-company-roles.ts`

```ts
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type CompanyRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  templateCode: string | null;
  syncedAt: string | null;
  divergent: boolean;
  parentRoleId: string | null;
  hierarchyLevel: number;
};

export async function listCompanyRoles(companyId: string): Promise<CompanyRole[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select(
      "id, code, name, description, is_system, template_code, template_synced_at, parent_role_id, hierarchy_level",
    )
    .eq("company_id", companyId)
    .order("hierarchy_level")
    .order("name");

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description ?? null,
    isSystem: r.is_system,
    templateCode: r.template_code,
    syncedAt: r.template_synced_at,
    divergent: r.template_code !== null && r.template_synced_at === null,
    parentRoleId: r.parent_role_id,
    hierarchyLevel: r.hierarchy_level,
  }));
}
```

### Step 3: Criar `list-manageable-roles.ts`

```ts
import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ManageableRole = {
  id: string;
  code: string;
  name: string;
  hierarchyLevel: number;
};

/**
 * Lista as roles que o usuário atual pode atribuir a outros membros,
 * baseado na hierarquia (can_manage_role). Não inclui roles fora da hierarquia
 * gerenciada pelo actor.
 */
export async function listManageableRoles(companyId: string): Promise<ManageableRole[]> {
  const supabase = await createClient();

  // Pega todas roles da empresa, filtra via can_manage_role
  const { data, error } = await supabase
    .from("roles")
    .select("id, code, name, hierarchy_level")
    .eq("company_id", companyId)
    .order("hierarchy_level");

  if (error) throw error;
  if (!data?.length) return [];

  // Filtra cada role via RPC can_manage_role
  // (Em batch — chamada RPC por role pode ser lenta com muitas roles. Aceitável <100 roles/tenant.)
  const checks = await Promise.all(
    data.map(async (r) => {
      const { data: ok } = await supabase.rpc("can_manage_role", {
        p_company: companyId,
        p_target_role: r.id,
      });
      return ok === true ? r : null;
    }),
  );

  return checks
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      hierarchyLevel: r.hierarchy_level,
    }));
}
```

### Step 4: Atualizar `create-role.ts` e `update-role.ts`

Em `create-role.ts`, adicionar campo `parent_role_id` (uuid opcional) ao schema/insert. Em `update-role.ts`, idem ao update. (Verificar arquivos atuais — leia eles primeiro pra preservar estrutura existente.)

Padrão para insert/update:

```ts
const parentRoleId = formData.get("parent_role_id");
const parentRoleIdValue =
  parentRoleId && typeof parentRoleId === "string" && parentRoleId !== "" ? parentRoleId : null;
```

E no insert/update payload: incluir `parent_role_id: parentRoleIdValue`.

### Step 5: Atualizar barrel

Em `src/modules/tenancy/index.ts`, adicionar:

```ts
export { listManageableRoles } from "./queries/list-manageable-roles";
export type { ManageableRole } from "./queries/list-manageable-roles";
```

### Step 6: Typecheck + tests

```bash
npm run typecheck && npx vitest run --dir src 2>&1 | tail -5
```

Expected: zero erros, testes pass.

### Step 7: Commit

```bash
git add src/types/database.types.ts \
        src/modules/tenancy/queries/list-company-roles.ts \
        src/modules/tenancy/queries/list-manageable-roles.ts \
        src/modules/tenancy/actions/create-role.ts \
        src/modules/tenancy/actions/update-role.ts \
        src/modules/tenancy/index.ts
git commit -m "feat(tenancy): queries e actions suportam hierarquia

PR #F. listCompanyRoles retorna parentRoleId + hierarchyLevel.
Novo listManageableRoles filtra via can_manage_role RPC.
create-role e update-role aceitam parent_role_id do form.
Types regenerados."
```

---

## Task 6: UI — Select de role superior + filtragem em member-roles-sheet

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/settings/roles/role-form.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/settings/roles/new/page.tsx` (passar parents)
- Modify: `src/app/(dashboard)/[companySlug]/settings/roles/[roleId]/page.tsx` (passar parents)
- Modify: `src/app/(dashboard)/[companySlug]/settings/members/member-roles-sheet.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/settings/members/page.tsx` (substituir availableRoles por manageableRoles)

### Step 1: Atualizar `role-form.tsx`

Ler arquivo atual primeiro. Depois adicionar Select para "Role superior" (parent_role_id). Lista deve incluir todas as roles da empresa EXCETO a própria role (se editing), ordenadas por hierarchy_level. Hidden field caso parent_role_id seja "" → null.

Sketch:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// adicionar prop availableParents
type Props = { /* existing */; availableParents: Array<{ id: string; name: string; hierarchyLevel: number }>; currentRoleId?: string };

// dentro do form, após o campo descrição:
<div>
  <Label htmlFor="parent_role_id">Role superior (opcional)</Label>
  <Select name="parent_role_id" defaultValue={initialParentId ?? ""}>
    <SelectTrigger>
      <SelectValue placeholder="Sem hierarquia (flat)" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">Sem hierarquia (flat)</SelectItem>
      {availableParents
        .filter((p) => p.id !== currentRoleId)
        .map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {"  ".repeat(p.hierarchyLevel)}{p.name}
          </SelectItem>
        ))}
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground mt-1">
    Hierarquia controla quem gerencia quem. Não propaga permissões.
  </p>
</div>
```

### Step 2: Atualizar `new/page.tsx` e `[roleId]/page.tsx` para passar availableParents

Buscar `listCompanyRoles(company.id)` (já é o que retorna a lista atual) e mapear pra `{ id, name, hierarchyLevel }`. Passar pro form.

### Step 3: Atualizar `member-roles-sheet.tsx`

Atualmente recebe `availableRoles: CompanyRole[]`. Trocar pra `manageableRoles` (vindo de `listManageableRoles`). O componente em si não precisa de mudança grande — apenas a fonte muda.

### Step 4: Atualizar parent page (`settings/members/page.tsx`)

Substituir chamada de `listCompanyRoles(company.id)` por `listManageableRoles(company.id)` quando passar para `member-roles-sheet`. Manter `listCompanyRoles` para outras visualizações.

### Step 5: Typecheck + lint

```bash
npm run typecheck && npm run lint
```

Expected: zero erros.

### Step 6: Commit

```bash
git add 'src/app/(dashboard)/[companySlug]/settings/roles/' \
        'src/app/(dashboard)/[companySlug]/settings/members/'
git commit -m "feat(ui): select de role superior + filtragem por can_manage_role

PR #F. role-form ganha Select de parent_role_id (lista ordenada por
hierarchy_level, indent visual). member-roles-sheet recebe lista
filtrada por can_manage_role RPC — actor só vê roles atribuíveis."
```

---

## Task 7: Push + PR + validação manual

- [ ] **Step 1:** Push:

```bash
git push -u origin feat/role-hierarchy
```

- [ ] **Step 2:** Criar PR base=feat/roles-evolution. Resumo completo + checklist DB/TS/manual.

- [ ] **Step 3 (manual):**
  - Login como owner em company X.
  - Acessar /[X]/settings/members → escolher membro → editar roles → verificar que só vê roles manageable (não vê outras owners).
  - Acessar /[X]/settings/roles/new → criar role "subordinada" do operator.
  - Tentar atribuir role do owner pra um non-owner (deve falhar com P0403 no backend; UI esconde via filtro).
  - Editar role custom → mudar parent → verificar persistência + recompute hierarchy_level.

---

## Self-Review Checklist

- Spec coverage Fase 2: schema ✓, anti-cycle trigger ✓, can_manage_role ✓, set_member_roles validate ✓, template hierarchy + backfill ✓, bootstrap 2-pass ✓, UI select+filter ✓.
- Placeholders: zero TBD/TODO.
- Hierarquia NÃO propaga perms (semântica explícita; sem código de propagação).
- Risk: CTE recursiva em can_manage_role pode ser slow com hierarquias profundas — depth limit 10 + chamada pontual (apenas em set_member_roles e listManageableRoles) mitiga.
- Backward compat: roles existentes ficam com parent=null (flat), comportamento atual preservado.
- listManageableRoles faz N+1 RPC calls — aceitável <100 roles/tenant. Otimizar (single SQL recursive query) se virar bottleneck.

## YAGNI (fora desta PR)

- Tree-view component (deferred).
- Propagação de permissões via hierarquia (spec proíbe).
- UI pra mover roles na hierarquia via drag-drop.
- Validação de circular dependency em template_templates.code self-ref (não relevante; templates atuais não têm ciclos).
- Audit triggers em mudanças de hierarquia (PR separado de 5.5).
