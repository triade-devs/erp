# PR #E — `platform_roles` granular Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir tabela boolean `platform_admins` por sistema role-based (`platform_roles` + `platform_role_assignments`). `is_platform_admin()` reescrita para ler nova tabela mantendo paridade total (todo platform admin atual continua admin via role `platform_admin` com `permissions=['*']`). Abre caminho pra "support staff" read-only no futuro sem mudar schema.

**Architecture:** 2 tabelas novas globais. Backfill 1:1 dos rows atuais. Função reescrita. `platform_admins` mantida como deprecated (drop em follow-up). Sem UI nesta PR.

**Tech Stack:** Supabase Postgres · plpgsql · RLS · MCP `apply_migration`.

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção 5.4.

**Depende de:** PRs #A–#D3 (em `feat/roles-evolution`).

**Não inclui:**

- UI para gerenciar platform roles/assignments — pode entrar em D3 follow-up ou PR separado quando houver demanda real.
- Drop final da tabela `platform_admins` — em follow-up após estabilização.
- Audit triggers (spec 5.5) — PR separado quando necessário.
- Permissions atômicas de plataforma (granular além de `'*'`) — quando houver caso de uso (e.g. support staff).

---

## File Structure

| Arquivo                                                                   | Responsabilidade                                 | Ação       |
| ------------------------------------------------------------------------- | ------------------------------------------------ | ---------- |
| `supabase/migrations/20260525000057_platform_roles_schema.sql`            | Schema + RLS                                     | CREATE     |
| `supabase/migrations/20260525000058_platform_roles_seed_and_backfill.sql` | Seed `platform_admin` + migrar `platform_admins` | CREATE     |
| `supabase/migrations/20260525000059_rewrite_is_platform_admin.sql`        | Reescreve function                               | CREATE     |
| `src/types/database.types.ts`                                             | Regen                                            | REGENERATE |

Não toca: TS (function existente já é chamada e mantém contrato), UI, outras policies.

---

## Pre-requisite: branch setup

- [ ] **Step 0: Branch from `feat/roles-evolution`**

```bash
git checkout feat/roles-evolution
git pull
git checkout -b feat/platform-roles
```

---

## Task 1: Migration 057 — Schema + RLS

**Files:**

- Create: `supabase/migrations/20260525000057_platform_roles_schema.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000057_platform_roles_schema.sql
-- PR #E da evolução de roles: substitui platform_admins boolean por
-- sistema role-based. Abre caminho pra "support staff" read-only sem
-- mudar schema futuramente. Sem mudança comportamental nesta migration
-- (function is_platform_admin reescrita na 059).

-- ─── platform_roles: catálogo global ─────────────────────────────────────────
create table public.platform_roles (
  code         text primary key,
  name         text not null,
  description  text,
  permissions  text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.platform_roles enable row level security;

create policy "platform_roles_select" on public.platform_roles
  for select using (auth.uid() is not null);

create policy "platform_roles_write_platform" on public.platform_roles
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.platform_roles is
  'PR #E: catálogo global de platform roles. Permissions é array de codes; ''*'' ou ''platform:*'' = full bypass.';

-- ─── platform_role_assignments: user × role ──────────────────────────────────
create table public.platform_role_assignments (
  user_id     uuid not null references auth.users(id) on delete cascade,
  role_code   text not null references public.platform_roles(code) on delete restrict,
  granted_by  uuid references auth.users(id),
  granted_at  timestamptz not null default now(),
  primary key (user_id, role_code)
);
create index idx_pra_user on public.platform_role_assignments(user_id);
create index idx_pra_role on public.platform_role_assignments(role_code);

alter table public.platform_role_assignments enable row level security;

-- Usuário vê próprias atribuições; platform admin vê tudo
create policy "platform_role_assignments_select" on public.platform_role_assignments
  for select using (
    user_id = auth.uid()
    or public.is_platform_admin()
  );

create policy "platform_role_assignments_write_platform" on public.platform_role_assignments
  for all using (public.is_platform_admin())
  with check (public.is_platform_admin());

comment on table public.platform_role_assignments is
  'PR #E: atribuição N×N user→platform_role. Substitui platform_admins. Drop da tabela antiga em follow-up.';
```

- [ ] **Step 2: Aplicar via MCP** (`name: platform_roles_schema`).

- [ ] **Step 3: Validar tabelas + RLS**

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public' and table_name in ('platform_roles','platform_role_assignments')
order by table_name, ordinal_position;
```

Expected: `platform_roles` 6 cols, `platform_role_assignments` 4 cols.

```sql
select tablename, count(*) as policies
from pg_policies
where tablename in ('platform_roles','platform_role_assignments')
group by tablename;
```

Expected: 2 cada (select + write).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525000057_platform_roles_schema.sql
git commit -m "feat(authz): platform_roles + platform_role_assignments schema

PR #E da evolução de roles. Cria 2 tabelas globais para substituir
platform_admins boolean por sistema role-based. RLS: leitura para
autenticados (próprias atribuições) + platform admin vê tudo; escrita
apenas platform admin.

Schema only — backfill na 058, rewrite is_platform_admin na 059."
```

---

## Task 2: Migration 058 — Seed default role + backfill

**Files:**

- Create: `supabase/migrations/20260525000058_platform_roles_seed_and_backfill.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000058_platform_roles_seed_and_backfill.sql
-- PR #E: seed da role default 'platform_admin' (permissions=['*']) e
-- backfill 1:1 de platform_admins → platform_role_assignments.

-- 1. Seed do role default
insert into public.platform_roles (code, name, description, permissions)
values (
  'platform_admin',
  'Administrador da Plataforma',
  'Bypass total — acesso a todos os dados e RPCs administrativos.',
  array['*']
)
on conflict (code) do nothing;

-- 2. Backfill: todo platform_admin atual vira assignment de 'platform_admin'
insert into public.platform_role_assignments (user_id, role_code, granted_by, granted_at)
select pa.user_id, 'platform_admin', pa.granted_by, pa.granted_at
from public.platform_admins pa
on conflict (user_id, role_code) do nothing;
```

- [ ] **Step 2: Aplicar via MCP** (`name: platform_roles_seed_and_backfill`).

- [ ] **Step 3: Validar seed + backfill**

```sql
-- Role default existe?
select code, name, permissions from platform_roles where code = 'platform_admin';
```

Expected: 1 row, permissions=`{*}`.

```sql
-- Todo platform_admin foi backfilled?
select
  (select count(*) from platform_admins) as legacy,
  (select count(*) from platform_role_assignments where role_code = 'platform_admin') as backfilled;
```

Expected: `legacy = backfilled`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260525000058_platform_roles_seed_and_backfill.sql
git commit -m "feat(authz): seed platform_admin role + backfill from platform_admins

PR #E. Cria role default 'platform_admin' com permissions=['*'] e migra
1:1 todos os rows de platform_admins para platform_role_assignments.
is_platform_admin ainda lê da tabela antiga — rewrite na 059."
```

---

## Task 3: Migration 059 — Rewrite `is_platform_admin()`

**Files:**

- Create: `supabase/migrations/20260525000059_rewrite_is_platform_admin.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260525000059_rewrite_is_platform_admin.sql
-- PR #E: is_platform_admin agora consulta platform_role_assignments + permissions.
-- Backward-compatible: todo platform_admin atual já foi backfilled na 058.
-- Tabela platform_admins mantida como deprecated (drop em follow-up).

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.platform_role_assignments pra
    join public.platform_roles pr on pr.code = pra.role_code
    where pra.user_id = auth.uid()
      and ('*' = any(pr.permissions) or 'platform:*' = any(pr.permissions))
  )
$$;

comment on function public.is_platform_admin() is
  'PR #E: lê platform_role_assignments. Retorna true se user tem role com permissions contendo ''*'' ou ''platform:*''.';

comment on table public.platform_admins is
  'PR #E DEPRECATED: substituída por platform_role_assignments. Mantida 1 release para rollback; drop em follow-up. is_platform_admin não lê mais daqui.';
```

- [ ] **Step 2: Aplicar via MCP** (`name: rewrite_is_platform_admin`).

- [ ] **Step 3: Validar function reescrita**

```sql
select prosrc from pg_proc
where proname = 'is_platform_admin'
  and pronamespace = (select oid from pg_namespace where nspname = 'public');
```

Expected: prosrc contém `platform_role_assignments` e `platform_roles`; NÃO contém `platform_admins`.

- [ ] **Step 4: Smoke test — function continua funcionando**

```sql
-- service_role context: auth.uid()=NULL → is_platform_admin retorna false
select is_platform_admin();
```

Expected: `false` (sem regressão; service role nunca foi admin).

```sql
-- Verifica que UM platform_admin real é admin
select pra.user_id, public.is_platform_admin() as result
from platform_role_assignments pra
limit 1;
```

NOTA: Esta query não consegue testar perfeitamente porque `is_platform_admin` usa `auth.uid()`, e via MCP `auth.uid()` é NULL. O teste real precisa ser via app (manual validation). Mas a função compila e retorna boolean sem erro, então sintaxe OK.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260525000059_rewrite_is_platform_admin.sql
git commit -m "feat(authz): is_platform_admin lê platform_role_assignments

PR #E. Reescreve function pra consultar platform_role_assignments +
platform_roles. Backward-compatible: backfill da 058 já garantiu
paridade — todo admin atual continua admin via role 'platform_admin'
com permissions=['*'].

platform_admins table mantida como deprecated (rollback path).
Drop final em follow-up após estabilização."
```

---

## Task 4: Regenerar tipos

- [ ] **Step 1:** Use `mcp__claude_ai_Supabase__generate_typescript_types` no projeto. Sobrescrever `src/types/database.types.ts`.

- [ ] **Step 2:** Validar:

```bash
grep -A 5 "platform_roles:" src/types/database.types.ts | head -15
grep -A 5 "platform_role_assignments:" src/types/database.types.ts | head -15
```

Expected: blocos Row/Insert/Update para ambas tabelas.

- [ ] **Step 3:** Typecheck:

```bash
npm run typecheck
```

Expected: zero erros.

- [ ] **Step 4:** Tests:

```bash
npx vitest run --dir src 2>&1 | tail -5
```

Expected: 114+ passes (sem regressão).

- [ ] **Step 5:** Commit:

```bash
git add src/types/database.types.ts
git commit -m "chore(types): regen database.types.ts (platform_roles + platform_role_assignments)"
```

---

## Task 5: Push + PR

- [ ] **Step 1:** Push:

```bash
git push -u origin feat/platform-roles
```

- [ ] **Step 2:** Criar PR base=feat/roles-evolution:

```bash
gh pr create --base feat/roles-evolution --title "feat(authz): platform_roles granular (PR #E)" --body "$(cat <<'EOF'
## Summary

PR #E da evolução de roles & permissões (spec 5.4).

Substitui tabela boolean \`platform_admins\` por sistema role-based:
- \`platform_roles\` (catálogo global com permissions array)
- \`platform_role_assignments\` (user × role)
- \`is_platform_admin()\` reescrita pra ler nova tabela
- Backfill 1:1 dos admins existentes pra role 'platform_admin' (permissions=['*'])
- Tabela \`platform_admins\` mantida como deprecated (drop em follow-up)

Abre caminho pra "support staff" read-only no futuro sem mudar schema.

## Migrations

- \`057\` schema: 2 tabelas + RLS
- \`058\` seed default role 'platform_admin' + backfill
- \`059\` rewrite is_platform_admin()

## Test Plan

- [x] DB: tabelas + RLS criadas
- [x] DB: role 'platform_admin' seedada com permissions=['*']
- [x] DB: backfill 1:1 (count(platform_admins) == count(platform_role_assignments where role_code='platform_admin'))
- [x] DB: is_platform_admin lê platform_role_assignments (pg_proc verificado)
- [x] \`npm run typecheck\` zero erros
- [x] \`npx vitest run --dir src\` mantém 114+ pass
- [ ] Manual: platform admin existente continua sendo admin (acessa /admin/platform/*)
- [ ] Manual: user não-admin continua não admin
- [ ] Manual: criar nova assignment via SQL → user vira admin

## Dependência

Base: \`feat/roles-evolution\` (PRs #A–#D3).

## Não inclui (deferido)

- UI pra gerenciar platform_roles e assignments (PR follow-up se demanda surgir).
- Drop final da tabela platform_admins (follow-up após estabilização).
- Audit triggers (spec 5.5) — PR separado.
- Permissions granulares (além de '*') — quando houver caso de uso.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

- Spec coverage seção 5.4: schema ✓, backfill ✓, rewrite function ✓, retrocompat (deprecation comment) ✓.
- Placeholders: zero TBD/TODO.
- Backward compat: paridade total — todo platform_admin continua admin via backfill.
- Risk: nenhum (mudança somente na fonte de leitura da function; mesma semântica externa).
- Rollback: re-rewrite function pra ler platform_admins (a tabela ainda existe).

## YAGNI (fora desta PR)

- UI pra platform_roles/assignments (sem demanda real ainda).
- Drop platform_admins (follow-up).
- Audit triggers (5.5).
- Roles com permissions granulares (support staff etc.) — escopo futuro.
- TS helper para listar platform admins (não há consumer no app).
