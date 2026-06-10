# PR #B — `has_permission()` absorve `is_platform_admin()` + filtro `is_active` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refatorar `has_permission(company, code)` para:

1. Retornar `true` automaticamente para platform admins (absorve `is_platform_admin()`).
2. Filtrar `role_permissions.is_active = true` (consome flag introduzida no PR #A).

Em seguida: cleanup de 15 policies que hoje fazem `is_platform_admin() OR has_permission(...)` — após o merge, o `OR` vira redundante.

**Architecture:** Uma migration reescreve a função (a outra remove redundância das policies). Backward-compatible para todos os consumidores TS (`requirePermission`, `withPermission`, `<Can>`) — eles já bypassam platform admin no nível TS, o que muda é a paridade com Postgres.

**Tech Stack:** Supabase Postgres + RLS · Migrations · Vitest (mocks de Supabase) — tests TS quase não tocam porque mocks de `requirePermission` continuam iguais.

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção 5.1.

**Depende de:** PR #A (`feat/role-permissions-is-active`) — precisa da coluna `role_permissions.is_active`. Quando PR #A merge em main, fazer rebase deste PR.

---

## File Structure

| Arquivo                                                                        | Responsabilidade                                          | Ação                        |
| ------------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------- |
| `supabase/migrations/20260523000047_has_permission_absorbs_platform_admin.sql` | Reescrita da function                                     | CREATE                      |
| `supabase/migrations/20260523000048_cleanup_redundant_platform_admin_or.sql`   | Drop+recreate de 15 policies sem `OR is_platform_admin()` | CREATE                      |
| `src/types/database.types.ts`                                                  | Regenerar caso function signature mude (não muda)         | OPCIONAL (skip se idêntica) |

Não toca: actions TS, queries TS, componentes React, ou `requirePermission`/`withPermission` services. Já bypassam platform admin no nível TS.

---

## Pre-requisite: branch setup

- [ ] **Step 0: Branch from `feat/role-permissions-is-active`**

```bash
git checkout feat/role-permissions-is-active
git pull
git checkout -b feat/has-permission-absorbs-platform-admin
```

Quando PR #A merge em main, este branch precisa rebase. Por enquanto, depende dos commits do PR #A.

---

## Task 1: Migration — `has_permission()` absorve platform admin + filtra `is_active`

**Files:**

- Create: `supabase/migrations/20260523000047_has_permission_absorbs_platform_admin.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260523000047_has_permission_absorbs_platform_admin.sql
-- PR #B da evolução de roles: has_permission() agora retorna true para
-- platform admins (paridade com requirePermission no TS) e filtra
-- role_permissions.is_active = true (consome flag do PR #A).
--
-- Substitui a function definida em 20260420000006_helpers_and_policies.sql.
-- Backward-compatible para todos os consumidores: ninguém precisa mudar.

create or replace function public.has_permission(p_company uuid, p_permission text)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
      or exists (
        select 1
        from public.memberships m
        join public.membership_roles mr on mr.membership_id = m.id
        join public.role_permissions rp on rp.role_id = mr.role_id
        where m.user_id = auth.uid()
          and m.company_id = p_company
          and m.status = 'active'
          and rp.permission_code = p_permission
          and rp.is_active = true
      )
$$;

comment on function public.has_permission(uuid, text) is
  'PR #B: absorve is_platform_admin() (paridade com requirePermission) e filtra is_active=true.';
```

- [ ] **Step 2: Aplicar migration**

Run: `npm run db:push` (ou via MCP `apply_migration` se CLI não configurado).
Expected: `Applied migration 20260523000047_has_permission_absorbs_platform_admin.sql`.

- [ ] **Step 3: Validar via SQL (caso platform admin)**

Via `mcp__claude_ai_Supabase__execute_sql` ou `psql`:

```sql
-- Como platform admin (auth.uid() pertence a platform_admins),
-- has_permission deve retornar true para qualquer perm em qualquer empresa.
-- Usar um company_id real:
select has_permission(
  (select id from companies limit 1),
  'inventory:product:read'
);
```

Expected: `true` (platform admin).

- [ ] **Step 4: Validar via SQL (caso is_active=false)**

Setup temporário (rollback ao final):

```sql
-- 1. Pegar um membership não-admin e uma role atribuída a ele
-- 2. Marcar perm como inactive
-- 3. Verificar has_permission retorna false
-- 4. Restaurar

begin;
  -- Escolhe um role_permission qualquer de uma empresa não-admin
  do $$
  declare
    v_role_id uuid;
    v_perm_code text;
    v_company_id uuid;
  begin
    select rp.role_id, rp.permission_code, r.company_id
      into v_role_id, v_perm_code, v_company_id
      from role_permissions rp join roles r on r.id = rp.role_id
      where rp.is_active = true
      limit 1;

    -- Desativa temporariamente
    update role_permissions
      set is_active = false
      where role_id = v_role_id and permission_code = v_perm_code;

    -- has_permission deve retornar false (chamado por um user não-admin com essa role)
    -- Em produção, esta query é feita com auth.uid() do user; aqui só validamos a função
    raise notice 'company=%, role=%, perm=% desativados', v_company_id, v_role_id, v_perm_code;
  end $$;
rollback;  -- desfaz para não afetar dados
```

Expected: notice impresso, sem erros, rollback limpo.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260523000047_has_permission_absorbs_platform_admin.sql
git commit -m "feat(authz): has_permission() absorbs is_platform_admin + filters is_active

PR #B da evolução de roles. Mudanças:
- Platform admins agora retornam true automaticamente (paridade com
  requirePermission do TS). Cada policy que tem 'OR is_platform_admin()'
  passa a ter o OR redundante — cleanup vem no commit seguinte.
- Filtra role_permissions.is_active = true (consome flag do PR #A).
  Módulos desabilitados via toggle não concedem mais acesso."
```

---

## Task 2: Cleanup das policies redundantes

**Files:**

- Create: `supabase/migrations/20260523000048_cleanup_redundant_platform_admin_or.sql`

**Escopo:** 15 policies que hoje têm `public.is_platform_admin() or public.has_permission(...)`. Após Task 1, o `OR is_platform_admin()` é redundante. Listadas abaixo (todas em migration 044 + 1 em 045):

| Tabela            | Policies                                    |
| ----------------- | ------------------------------------------- |
| `products`        | insert, update, delete                      |
| `stock_movements` | insert                                      |
| `kb_categories`   | insert, update, delete                      |
| `kb_articles`     | insert, update, delete                      |
| `kb_videos`       | insert, update, delete (delete está em 045) |

**NÃO incluir:**

- `profiles_select_own_or_admin` (`id = auth.uid() or is_platform_admin()`) — `is_platform_admin` NÃO é redundante (não há `has_permission` aqui).
- `companies_*`, `memberships_*`, `roles_*`, `audit_logs_*`, `platform_admins_*`, `modules_*` — usam `is_platform_admin` para gating de plataforma, sem `has_permission` no OR. Mantém.

- [ ] **Step 1: Escrever migration**

```sql
-- 20260523000048_cleanup_redundant_platform_admin_or.sql
-- PR #B cleanup: após has_permission() absorver is_platform_admin(),
-- o padrão 'public.is_platform_admin() OR public.has_permission(...)'
-- vira redundante. Esta migration recria 15 policies sem o OR.
--
-- Critério para inclusão nesta migration: policy combina is_platform_admin
-- com has_permission via OR. Policies que usam is_platform_admin sozinho
-- (gating de plataforma, sem has_permission) NÃO entram.

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert with check (public.has_permission(company_id, 'inventory:product:create'));

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update
  using (public.has_permission(company_id, 'inventory:product:update'))
  with check (public.has_permission(company_id, 'inventory:product:update'));

drop policy if exists "products_delete" on public.products;
create policy "products_delete" on public.products
  for delete using (public.has_permission(company_id, 'inventory:product:delete'));

-- ─── STOCK MOVEMENTS ─────────────────────────────────────────────────────────
drop policy if exists "movements_insert" on public.stock_movements;
create policy "movements_insert" on public.stock_movements
  for insert with check (public.has_permission(company_id, 'movements:movement:create'));

-- ─── KB CATEGORIES ────────────────────────────────────────────────────────────
drop policy if exists "kb_categories_insert" on public.kb_categories;
create policy "kb_categories_insert" on public.kb_categories
  for insert with check (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_categories_update" on public.kb_categories;
create policy "kb_categories_update" on public.kb_categories
  for update using (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_categories_delete" on public.kb_categories;
create policy "kb_categories_delete" on public.kb_categories
  for delete using (public.has_permission(company_id, 'kb:article:write'));

-- ─── KB ARTICLES ─────────────────────────────────────────────────────────────
drop policy if exists "kb_articles_insert" on public.kb_articles;
create policy "kb_articles_insert" on public.kb_articles
  for insert with check (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_articles_update" on public.kb_articles;
create policy "kb_articles_update" on public.kb_articles
  for update using (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_articles_delete" on public.kb_articles;
create policy "kb_articles_delete" on public.kb_articles
  for delete using (public.has_permission(company_id, 'kb:article:write'));

-- ─── KB VIDEOS ───────────────────────────────────────────────────────────────
drop policy if exists "kb_videos_insert" on public.kb_videos;
create policy "kb_videos_insert" on public.kb_videos
  for insert with check (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_videos_update" on public.kb_videos;
create policy "kb_videos_update" on public.kb_videos
  for update using (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_videos_delete" on public.kb_videos;
create policy "kb_videos_delete" on public.kb_videos
  for delete using (public.has_permission(company_id, 'kb:article:write'));
```

- [ ] **Step 2: Aplicar migration**

Run: `npm run db:push` (ou MCP).

- [ ] **Step 3: Validar policies recriadas**

```sql
-- Conta policies por tabela alvo — esperado: cada tabela com count >= 1 com qualquer das ações
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where tablename in ('products','stock_movements','kb_categories','kb_articles','kb_videos')
order by tablename, cmd, policyname;
```

Expected: 13 policies de write (products insert/update/delete = 3, stock_movements insert = 1, kb_categories 3, kb_articles 3, kb_videos 3) — todas sem `is_platform_admin` no `qual`/`with_check`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260523000048_cleanup_redundant_platform_admin_or.sql
git commit -m "refactor(authz): drop redundant 'is_platform_admin OR' from 15 policies

Após PR #B Task 1 (has_permission absorve platform admin), o OR vira
redundante. Recria policies de products, stock_movements e knowledge-base
(insert/update/delete onde aplicável) chamando só has_permission.
Comportamento idêntico — platform admin bypassa via função."
```

---

## Task 3: Validação manual de regressão

Sem mudança no TS, mas mudança semântica grande. Validar com matriz manual:

- [ ] **Step 1: Subir dev server**

`npm run dev`

- [ ] **Step 2: Caso A — platform admin escreve em produtos**

1. Login como user em `platform_admins` (sem membership em company X).
2. Acessar `/admin/companies/<X>/...` e tentar criar/editar/deletar produto.
3. Expected: funciona (has_permission retorna true).

- [ ] **Step 3: Caso B — user comum com perm ativa**

1. Login como user com membership em company Y + role com `inventory:product:read` (is_active=true).
2. Acessar `/Y/inventory`.
3. Expected: lista produtos.

- [ ] **Step 4: Caso C — user comum com perm desativada (footgun do PR #A resolvido aqui)**

1. Como platform admin, desabilitar módulo `inventory` em company Z via `/admin/companies/Z/modules`.
2. Verificar via SQL: `select is_active from role_permissions where permission_code like 'inventory:%' and role_id in (select id from roles where company_id = 'Z')` — todos `false`.
3. Login como user comum de Z.
4. Acessar `/Z/inventory`.
5. Expected: NÃO mostra produtos (`has_permission` agora filtra is_active=false → bloqueado).
6. Reabilitar módulo. Verificar acesso volta.

- [ ] **Step 5: Caso D — auditoria de regressão**

Rodar suite TS completa:

```bash
npm run test
```

Expected: 596+ tests pass (não há mudança esperada nos mocks; `requirePermission` continua sendo chamado igual).

---

## Task 4: Self-review + PR

- [ ] **Step 1: Code review checklist**

- Migration 047 reescreve `has_permission` com sintaxe SQL idêntica ao spec seção 5.1? ✓
- Comment na function explica mudança? ✓
- Migration 048 NÃO toca policies que usam `is_platform_admin` sozinho? ✓ (verifica `companies_*`, `memberships_*` etc. intactos)
- Tests TS verdes? ✓
- Validação manual de regressão checada? ✓

- [ ] **Step 2: Push + abrir PR**

```bash
git push -u origin feat/has-permission-absorbs-platform-admin
gh pr create --base feat/role-permissions-is-active --title "feat(authz): has_permission absorbs platform admin + cleanup (PR #B)" --body "$(cat <<'EOF'
## Summary

PR #B da evolução de roles & permissões (spec seção 5.1).

- `has_permission()` agora retorna true para platform admins (paridade com `requirePermission` do TS) e filtra `role_permissions.is_active = true` (consome flag introduzida no PR #A).
- 15 policies que faziam `is_platform_admin() OR has_permission(...)` recriadas sem o OR redundante. Comportamento idêntico.

## Dependência

Depende do PR #A (`feat/role-permissions-is-active`). Rebase necessário se merge desordenado.

## Migrations

- `20260523000047_has_permission_absorbs_platform_admin.sql` — reescrita.
- `20260523000048_cleanup_redundant_platform_admin_or.sql` — drop+recreate de 15 policies.

## Test Plan

- [x] `npm run test` — todos os mocks TS continuam válidos
- [x] `npm run typecheck` — zero erros
- [ ] Manual: platform admin escreve em qualquer empresa
- [ ] Manual: user comum com perm ativa lê normalmente
- [ ] Manual: módulo desabilitado bloqueia acesso (footgun PR #A resolvido)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

- **Coverage:** Spec seção 5.1 inteira (function rewrite + policy cleanup). ✓
- **Placeholders:** Zero TBD/TODO.
- **Type consistency:** Function signature inalterada — TS types ficam idênticos.
- **Risk:** Mudança semântica grande mas backward-compatible para TS. RLS muda comportamento — manual validation crítica.
- **Rollback:** Migration 047 pode ser revertida com `create or replace` para versão anterior. Migration 048 pode ser revertida recriando policies com OR. Documentar reversos no PR body se merge for problemático.

## YAGNI (explicitamente fora desta PR)

- UI badge "Inativo" em role permissions table (cosmético).
- Refactor de mock factories em toggle-module/bulk-toggle (vem com PR #D).
- Cleanup de erros silenciosos em SELECTs (cleanup PR separado quando virar dor).
- Templates globais (PR #D).
