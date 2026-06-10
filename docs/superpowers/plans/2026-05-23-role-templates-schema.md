# PR #D1 — Role templates schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduzir camada global de templates de roles. Cada tenant tem instâncias que apontam para o template via `template_code`. Sincronização explícita via RPC. Sem UI nesta PR — apenas schema + data migration + bootstrap RPC update. UI vem em D3.

**Architecture:** Duas tabelas globais (`role_templates`, `template_permissions`) + 2 colunas em `roles` (`template_code`, `template_synced_at`). Bootstrap de empresa nova passa a iterar templates. RPC `apply_template_to_company` para sync (re-aplica template em role específica). Trigger zera `template_synced_at` quando tenant customiza, marcando divergência.

**Tech Stack:** Supabase Postgres · plpgsql · RLS · MCP `apply_migration`.

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção "Fase 1".

**Depende de:** PRs #A, #B, #C (já em `feat/roles-evolution`). Esta PR sobe sobre `feat/roles-evolution`.

**Não inclui (escopo deferido):**

- Kill `is_owner` (vem em D2).
- UI de gestão de templates (`/admin/platform/role-templates` + reformulação `/admin/platform/roles`) — vem em D3.
- Badge "Personalizada" + botão reset em `/[companySlug]/settings/roles` — D3.
- Remover RPC obsoleta `update_system_role_permissions` — D3 (UI atual ainda usa).
- Atualizar `toggleModuleAction`/`bulkToggleModuleForCompaniesAction` para usar templates ao habilitar módulo novo (refactor de D3 ou follow-up).

---

## File Structure

| Arquivo                                                                   | Responsabilidade                                                                             | Ação       |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------- |
| `supabase/migrations/20260523000051_role_templates_schema.sql`            | Tabelas globais + colunas em roles + RLS                                                     | CREATE     |
| `supabase/migrations/20260523000052_seed_templates_from_system_roles.sql` | Data migration: snapshot existing system roles                                               | CREATE     |
| `supabase/migrations/20260523000053_bootstrap_and_apply_template_rpc.sql` | Reescreve `bootstrap_company_rbac`, cria `apply_template_to_company`, trigger de divergência | CREATE     |
| `src/types/database.types.ts`                                             | Regenerar (novas tabelas + colunas)                                                          | REGENERATE |

Não toca: actions TS, queries TS, componentes React, RLS de tabelas existentes.

---

## Pre-requisite: branch setup

- [ ] **Step 0: Branch from `feat/roles-evolution`**

```bash
git checkout feat/roles-evolution
git pull
git checkout -b feat/role-templates-schema
```

---

## Task 1: Migration 051 — Tabelas globais + colunas em `roles` + RLS

**Files:**

- Create: `supabase/migrations/20260523000051_role_templates_schema.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260523000051_role_templates_schema.sql
-- PR #D1 da evolução de roles: catálogo global de templates de role + ligação
-- das instâncias por tenant (roles.template_code, roles.template_synced_at).
-- Sem mudança comportamental nesta migration — dados são populados na 052,
-- e bootstrap passa a usar templates na 053.

-- ─── role_templates: catálogo global ─────────────────────────────────────────
create table public.role_templates (
  code         text primary key,
  name         text not null,
  description  text,
  is_system    boolean not null default false,
  sort_order   int not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_role_templates_sort on public.role_templates(sort_order);

alter table public.role_templates enable row level security;

-- Leitura global (autenticados); escrita só platform admin
create policy "role_templates_select" on public.role_templates
  for select using (auth.uid() is not null);

create policy "role_templates_write_platform" on public.role_templates
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.role_templates is
  'PR #D1: catálogo global de templates (perfis-padrão). Instâncias por tenant em public.roles via template_code.';

-- ─── template_permissions: contrato de cada template ─────────────────────────
create table public.template_permissions (
  template_code   text not null references public.role_templates(code) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  added_at        timestamptz not null default now(),
  primary key (template_code, permission_code)
);
create index idx_template_permissions_template on public.template_permissions(template_code);

alter table public.template_permissions enable row level security;

create policy "template_permissions_select" on public.template_permissions
  for select using (auth.uid() is not null);

create policy "template_permissions_write_platform" on public.template_permissions
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.template_permissions is
  'PR #D1: permissões que compõem cada template. Fonte para apply_template_to_company.';

-- ─── roles: ligação para template ────────────────────────────────────────────
alter table public.roles
  add column template_code text references public.role_templates(code) on delete set null,
  add column template_synced_at timestamptz;

create index idx_roles_template_code on public.roles(template_code);

comment on column public.roles.template_code is
  'PR #D1: template do qual esta role foi instanciada (null = role custom criada do zero).';
comment on column public.roles.template_synced_at is
  'PR #D1: última vez que esta role recebeu apply do template. NULL = divergente (customizada após bootstrap/apply).';
```

- [ ] **Step 2: Aplicar via MCP**

`mcp__claude_ai_Supabase__apply_migration` em `jrfyfgpjnswcguvvuxpx`. Nome: `role_templates_schema`. Query: SQL acima sem o cabeçalho.

- [ ] **Step 3: Validar tabelas + colunas**

```sql
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (table_name in ('role_templates','template_permissions')
       or (table_name = 'roles' and column_name in ('template_code','template_synced_at')))
order by table_name, ordinal_position;
```

Expected: `role_templates` com 7 colunas, `template_permissions` com 3 colunas, `roles` com `template_code text` (nullable) e `template_synced_at timestamptz` (nullable).

- [ ] **Step 4: Validar RLS habilitada**

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('role_templates','template_permissions');
```

Expected: ambas com `rowsecurity = true`.

- [ ] **Step 5: Validar policies**

```sql
select tablename, policyname, cmd
from pg_policies
where tablename in ('role_templates','template_permissions')
order by tablename, policyname;
```

Expected: 4 rows totais (2 por tabela: select autenticados + write platform admin).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260523000051_role_templates_schema.sql
git commit -m "feat(authz): role_templates + template_permissions schema

PR #D1 da evolução de roles. Cria catálogo global de templates e tabela
de permissões por template. Adiciona roles.template_code (ligação) e
roles.template_synced_at (marca divergência). RLS: leitura para autenticados,
escrita apenas platform admin.

Schema-only — populated pela 052, RPC + bootstrap update na 053.
Sem mudança comportamental ainda."
```

---

## Task 2: Migration 052 — Snapshot dos system roles existentes

**Files:**

- Create: `supabase/migrations/20260523000052_seed_templates_from_system_roles.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260523000052_seed_templates_from_system_roles.sql
-- PR #D1: popula role_templates e template_permissions a partir do estado
-- atual das system roles (owner/manager/operator). Marca instâncias existentes
-- como sincronizadas (template_synced_at = now()).
--
-- Lógica de seed:
--   - Para cada role.code distinto com is_system=true: cria template.
--   - Permissões do template: união das permissões observadas em todas as
--     instâncias daquela role.code. Tenant que diverge em uma perm específica
--     vai aparecer divergente após apply do template no futuro.

-- 1. Inserir templates (idempotente)
insert into public.role_templates (code, name, description, is_system, sort_order)
select distinct
  r.code,
  initcap(r.name),
  case r.code
    when 'owner'    then 'Acesso total à empresa'
    when 'manager'  then 'Gestão operacional de módulos habilitados'
    when 'operator' then 'Leitura e criação em módulos habilitados'
    else null
  end,
  true,
  case r.code
    when 'owner' then 0
    when 'manager' then 10
    when 'operator' then 20
    else 100
  end
from public.roles r
where r.is_system
on conflict (code) do nothing;

-- 2. Inserir template_permissions (união das perms observadas)
insert into public.template_permissions (template_code, permission_code)
select distinct r.code, rp.permission_code
from public.roles r
join public.role_permissions rp on rp.role_id = r.id
where r.is_system
  and rp.is_active = true
on conflict do nothing;

-- 3. Vincular instâncias existentes ao template e marcar sincronizadas
update public.roles
  set template_code = code,
      template_synced_at = now()
  where is_system
    and template_code is null;
```

- [ ] **Step 2: Aplicar via MCP** (`name: seed_templates_from_system_roles`).

- [ ] **Step 3: Validar templates criados**

```sql
select code, name, is_system, sort_order from role_templates order by sort_order;
```

Expected: 3 rows mínimo — `owner`, `manager`, `operator` (is_system=true, sort_order 0/10/20).

- [ ] **Step 4: Validar template_permissions populadas**

```sql
select template_code, count(*) as perm_count
from template_permissions
group by template_code
order by template_code;
```

Expected: pelo menos `owner` com mais perms que `manager` que tem mais que `operator` (owner = união de tudo).

- [ ] **Step 5: Validar instâncias linkadas**

```sql
select code, count(*) as instances, count(*) filter (where template_code is not null) as linked,
       count(*) filter (where template_synced_at is not null) as synced
from roles
where is_system
group by code
order by code;
```

Expected: para cada code (owner/manager/operator), `instances = linked = synced` (todas linkadas e sincronizadas).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260523000052_seed_templates_from_system_roles.sql
git commit -m "feat(authz): seed templates from existing system roles

PR #D1. Snapshot do estado atual: cada code distinto de role system
vira template; permissões observadas (is_active=true) viram
template_permissions. Instâncias existentes ficam linkadas via
template_code e marcadas sincronizadas (template_synced_at = now())."
```

---

## Task 3: Migration 053 — `bootstrap_company_rbac` reescrita + `apply_template_to_company` + trigger de divergência

**Files:**

- Create: `supabase/migrations/20260523000053_bootstrap_and_apply_template_rpc.sql`

**Contexto:** `bootstrap_company_rbac(uuid)` atual está em `20260420000006_helpers_and_policies.sql:39-107`. Hard-coda owner/manager/operator com lógica embutida. Reescrita: itera `role_templates where is_system` e copia `template_permissions → role_permissions`. Permissão fica filtrada pelos módulos habilitados na empresa (mantém comportamento atual de só ativar perms de módulos com `company_modules` row).

- [ ] **Step 1: Escrever migration**

```sql
-- 20260523000053_bootstrap_and_apply_template_rpc.sql
-- PR #D1: substitui bootstrap_company_rbac por versão que itera templates.
-- Cria apply_template_to_company para resync per role. Trigger zera
-- template_synced_at quando role_permissions divergem do template.

-- ─── bootstrap_company_rbac: reescrita usando templates ──────────────────────
create or replace function public.bootstrap_company_rbac(p_company uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tpl record;
  v_role_id uuid;
begin
  for v_tpl in
    select code, name from public.role_templates where is_system order by sort_order
  loop
    -- Cria/recupera instância
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

    -- Aplica permissões do template, filtradas pelos módulos habilitados
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
end $$;

comment on function public.bootstrap_company_rbac(uuid) is
  'PR #D1: itera role_templates(is_system) e instancia roles + permissions por empresa, filtrando perms por module_code em company_modules.';

-- ─── apply_template_to_company: resync de uma role específica ────────────────
create or replace function public.apply_template_to_company(
  p_company uuid,
  p_template_code text,
  p_force boolean default false
) returns table (role_id uuid, perms_added int, perms_removed int)
language plpgsql security definer set search_path = public as $$
declare
  v_role_id uuid;
  v_synced_at timestamptz;
  v_added int := 0;
  v_removed int := 0;
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito a platform admins' using errcode = 'P0401';
  end if;

  if not exists (select 1 from public.role_templates where code = p_template_code) then
    raise exception 'Template % não existe', p_template_code using errcode = 'P0404';
  end if;

  select r.id, r.template_synced_at into v_role_id, v_synced_at
  from public.roles r
  where r.company_id = p_company and r.code = p_template_code;

  if v_role_id is null then
    raise exception 'Empresa % não tem instância da role %', p_company, p_template_code
      using errcode = 'P0404';
  end if;

  -- Se divergente e sem force, pular
  if v_synced_at is null and not p_force then
    raise exception 'Role % divergiu do template; use p_force=true para sobrescrever',
      p_template_code using errcode = 'P0409';
  end if;

  -- Calcula diff: remove perms que não estão mais no template + filtradas
  with target_perms as (
    select tp.permission_code
    from public.template_permissions tp
    join public.permissions p on p.code = tp.permission_code
    where tp.template_code = p_template_code
      and (
        p.module_code = 'core'
        or p.module_code in (
          select module_code from public.company_modules where company_id = p_company
        )
      )
  ),
  current_perms as (
    select permission_code from public.role_permissions
    where role_id = v_role_id and is_active = true
  ),
  removed as (
    delete from public.role_permissions
    where role_id = v_role_id
      and permission_code in (
        select permission_code from current_perms
        except select permission_code from target_perms
      )
    returning 1
  ),
  added as (
    insert into public.role_permissions (role_id, permission_code, is_active)
      select v_role_id, permission_code, true
      from target_perms
      where permission_code not in (select permission_code from current_perms)
      on conflict (role_id, permission_code) do update set is_active = true
      returning 1
  )
  select (select count(*) from added), (select count(*) from removed)
  into v_added, v_removed;

  -- Marca como sincronizada (atualização explícita após trigger zerar)
  update public.roles set template_synced_at = now() where id = v_role_id;

  return query select v_role_id, v_added, v_removed;
end $$;

revoke all on function public.apply_template_to_company(uuid, text, boolean) from public, anon;
grant execute on function public.apply_template_to_company(uuid, text, boolean) to authenticated;

comment on function public.apply_template_to_company(uuid, text, boolean) is
  'PR #D1: resync de uma role com seu template. Pula se divergente (synced_at IS NULL) salvo p_force=true. Retorna (role_id, perms_added, perms_removed).';

-- ─── Trigger: zera template_synced_at quando role_permissions diverge ────────
create or replace function public.mark_template_divergence()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_role_id uuid;
begin
  v_role_id := coalesce(new.role_id, old.role_id);

  -- Só zera se a role aponta para um template
  update public.roles
    set template_synced_at = null
    where id = v_role_id and template_code is not null;

  return coalesce(new, old);
end $$;

create trigger trg_role_permissions_mark_divergence
  after insert or update or delete on public.role_permissions
  for each row execute function public.mark_template_divergence();

comment on function public.mark_template_divergence() is
  'PR #D1: zera roles.template_synced_at quando role_permissions é alterado, sinalizando divergência. apply_template_to_company re-marca synced ao final.';
```

- [ ] **Step 2: Aplicar via MCP** (`name: bootstrap_and_apply_template_rpc`).

- [ ] **Step 3: Validar bootstrap_company_rbac reescrita**

```sql
select prosrc from pg_proc
where proname = 'bootstrap_company_rbac'
  and pronamespace = (select oid from pg_namespace where nspname = 'public');
```

Expected: prosrc contém `role_templates` (versão nova).

- [ ] **Step 4: Validar apply_template_to_company existe**

```sql
select proname, proargnames, proargtypes::regtype[], prosecdef
from pg_proc
where proname = 'apply_template_to_company'
  and pronamespace = (select oid from pg_namespace where nspname = 'public');
```

Expected: 1 row, `proargnames={p_company,p_template_code,p_force}`, `proargtypes={uuid,text,boolean}`, `prosecdef=true`.

- [ ] **Step 5: Validar trigger criado**

```sql
select tgname, tgrelid::regclass, tgenabled
from pg_trigger
where tgname = 'trg_role_permissions_mark_divergence';
```

Expected: 1 row, table = `role_permissions`, enabled.

- [ ] **Step 6: Smoke test — trigger zera synced_at em mudança real**

```sql
-- Pega uma role system que está synced
select id, code, template_synced_at from roles
where is_system and template_synced_at is not null limit 1;
```

Anota `<role_id>` retornado. Depois:

```sql
begin;
  -- Adiciona perm dummy só pra triggear (NÃO commit)
  insert into role_permissions (role_id, permission_code, is_active)
    values ('<role_id>', 'core:audit:read', true)
    on conflict (role_id, permission_code) do update set is_active = true;

  -- Sync at deve ter zerado
  select code, template_synced_at from roles where id = '<role_id>';
rollback;
```

Expected: `template_synced_at IS NULL` dentro da transação. Rollback restaura.

- [ ] **Step 7: Smoke test — apply_template_to_company gate P0401**

```sql
select * from apply_template_to_company((select id from companies limit 1), 'owner');
```

Expected: ERROR `Acesso restrito a platform admins` SQLSTATE `P0401` (via service role).

- [ ] **Step 8: Validar policies de RLS de roles ainda funcionando**

```sql
-- Sanity: roles select policy não regride com novas colunas
select policyname, qual from pg_policies
where tablename = 'roles' and cmd = 'SELECT';
```

Expected: policies existentes intactas, especificamente `roles_select`.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20260523000053_bootstrap_and_apply_template_rpc.sql
git commit -m "feat(authz): bootstrap usa templates + apply_template_to_company RPC

PR #D1. Reescreve bootstrap_company_rbac iterando role_templates(is_system).
Cria apply_template_to_company(uuid, text, boolean) — resync de role com
seu template; pula divergentes salvo p_force=true; retorna diff
(added, removed). Trigger zera template_synced_at em qualquer mudança
de role_permissions, marcando divergência."
```

---

## Task 4: Regenerar tipos

- [ ] **Step 1: Regenerar via MCP**

`mcp__claude_ai_Supabase__generate_typescript_types` no projeto. Escrever em `src/types/database.types.ts`.

- [ ] **Step 2: Validar tipos**

```bash
grep -A 20 "role_templates:" src/types/database.types.ts | head -25
```

Expected: bloco `Row`/`Insert`/`Update` para `role_templates` presente.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: zero erros.

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regen database.types.ts (role_templates + template_permissions)"
```

---

## Task 5: Push + PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/role-templates-schema
```

- [ ] **Step 2: Criar PR**

```bash
gh pr create --base feat/roles-evolution --title "feat(authz): role templates schema (PR #D1)" --body "$(cat <<'EOF'
## Summary

PR #D1 da evolução de roles & permissões (spec seção 'Fase 1', schema only).

- Cria \`role_templates\` (catálogo global) + \`template_permissions\` (conteúdo).
- Adiciona \`roles.template_code\` (ligação) e \`roles.template_synced_at\` (marca divergência).
- Reescreve \`bootstrap_company_rbac\` iterando templates.
- Cria RPC \`apply_template_to_company(company, template, force)\` retornando diff (added/removed).
- Trigger zera \`template_synced_at\` em qualquer mudança de \`role_permissions\`, marcando divergência automaticamente.
- Seeda templates a partir das system roles atuais (owner/manager/operator) sem mudança comportamental.

## Não inclui (escopo deferido)

- D2: Kill \`is_owner\` (rename → drop em release seguinte).
- D3: UI \`/admin/platform/role-templates\` + reformulação \`/admin/platform/roles\` + badge "Personalizada" + reset button + remoção do RPC obsoleto \`update_system_role_permissions\`.

## Dependência

Base: \`feat/roles-evolution\` (com PRs #A, #B, #C).

## Migrations

- \`051_role_templates_schema.sql\` — tabelas + colunas + RLS
- \`052_seed_templates_from_system_roles.sql\` — snapshot dos system roles atuais
- \`053_bootstrap_and_apply_template_rpc.sql\` — bootstrap reescrita + apply RPC + trigger

## Test Plan

- [x] DB: tabelas e colunas criadas com tipos/nullability corretos
- [x] DB: RLS habilitada com 4 policies (2 por tabela nova)
- [x] DB: 3 templates seedados (owner/manager/operator) + template_permissions populadas
- [x] DB: instâncias existentes linkadas + marcadas sincronizadas
- [x] DB: bootstrap_company_rbac reescrita validada via pg_proc
- [x] DB: apply_template_to_company existe com signature correta
- [x] DB: trigger trg_role_permissions_mark_divergence criado
- [x] Smoke: trigger zera template_synced_at em mudança de role_permissions
- [x] Smoke: apply_template_to_company gate P0401 funciona
- [ ] Manual: criar empresa nova → bootstrap usa templates corretamente
- [ ] Manual: apply_template_to_company com empresa real + force=true
- [ ] Manual: divergência por edit em /settings/roles zera synced_at

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

- Spec coverage (seção Fase 1, schema only): tabelas ✓, colunas ✓, bootstrap ✓, apply RPC ✓, trigger de divergência ✓.
- Placeholders: zero TBD/TODO.
- Type consistency: regen capturado em Task 4.
- Backward compat: bootstrap_company_rbac assinatura idêntica; ninguém quebra.
- Risco: trigger AFTER INSERT/UPDATE/DELETE em role_permissions adiciona overhead a CADA operação de granted/revoked. Aceitar — bulk updates de toggle ainda são instantâneos no scale atual.
- Rollback: drop tables + drop functions + drop trigger + alter table drop columns. Reversível.

## YAGNI (fora desta PR)

- UI (D3).
- Kill is_owner (D2).
- `apply_template_to_all_companies` (helper bulk) — adicionar em D3 se necessário.
- Trigger condicional (só dispara fora do apply_template_to_company) — apply re-marca synced no final, então redundância está OK.
- Auditoria de mudanças em template_permissions (PR #B 5.5 cuida).
