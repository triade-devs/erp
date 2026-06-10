# PR #D2 — Kill `is_owner` (rename + policy migration) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner deixa de ser boolean denormalizado em `memberships.is_owner` e passa a ser puramente derivado da role `owner` via `membership_roles`. Policies, triggers e TS atualizados. Coluna renomeada para `legacy_is_owner` (deprecação visível); drop final em follow-up após 1 release de estabilização.

**Architecture:** Source of truth = `membership_roles` JOIN `roles` WHERE `code='owner'`. TS deriva `isOwner` de `roles.includes('owner')`. Policies que dependiam de `is_owner` viram `EXISTS (...)` join. Triggers que setavam `is_owner=true` agora INSERT em `membership_roles` apontando pra role owner.

**Tech Stack:** Supabase Postgres · plpgsql · RLS · TS (Server Components, Server Actions, queries) · Vitest.

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção "Fase 1" (subsection "Mata `is_owner`") + spec 5.1.

**Depende de:** PRs #A, #B, #C, #D1 (em `feat/roles-evolution`). Sobe sobre `feat/roles-evolution`.

**Não inclui:**

- Drop final da coluna `legacy_is_owner` — D2-followup após estabilização.
- UI changes (badge "Personalizada" + reset button) — D3.
- Reformulação `/admin/platform/roles` → templates UI — D3.

---

## File Structure

| Arquivo                                                              | Responsabilidade                               | Ação       |
| -------------------------------------------------------------------- | ---------------------------------------------- | ---------- |
| `supabase/migrations/20260524000054_kill_is_owner_policies.sql`      | Backfill + policies + triggers + rename column | CREATE     |
| `src/types/database.types.ts`                                        | Regen (rename column)                          | REGENERATE |
| `src/modules/auth/queries/get-current-user.ts`                       | Derive `isOwner` de roles                      | MODIFY     |
| `src/modules/tenancy/queries/list-company-members.ts`                | Idem                                           | MODIFY     |
| `src/modules/tenancy/actions/update-member-status.ts`                | Check owner via roles, não column              | MODIFY     |
| `src/modules/tenancy/actions/transfer-member.ts`                     | Idem                                           | MODIFY     |
| `src/modules/tenancy/actions/__tests__/update-member-status.test.ts` | Adapta mocks                                   | MODIFY     |
| `src/modules/tenancy/actions/__tests__/transfer-member.test.ts`      | Adapta mocks                                   | MODIFY     |

Não toca: componentes React (consumidores de `isOwner` continuam funcionando — só muda a fonte da prop).

---

## Pre-requisite: branch setup

- [ ] **Step 0: Branch from `feat/roles-evolution`**

```bash
git checkout feat/roles-evolution
git pull
git checkout -b feat/kill-is-owner
```

---

## Task 1: Migration 054 — Backfill + policies + triggers + rename

**Files:**

- Create: `supabase/migrations/20260524000054_kill_is_owner_policies.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260524000054_kill_is_owner_policies.sql
-- PR #D2 da evolução de roles: owner deixa de ser boolean denormalizado.
-- Fonte de verdade passa a ser membership_roles + roles.code = 'owner'.
-- Coluna renomeada para legacy_is_owner (deprecação); drop em follow-up.

-- ─── 1. Backfill: garante role 'owner' para todo membership com is_owner=true ─
insert into public.membership_roles (membership_id, role_id)
  select m.id, r.id
  from public.memberships m
  join public.roles r on r.company_id = m.company_id and r.code = 'owner'
  where m.is_owner = true
  on conflict do nothing;

-- ─── 2. Helper para checar owner por membership ──────────────────────────────
-- Reutilizado em policies e queries downstream
create or replace function public.is_membership_owner(p_membership_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.membership_roles mr
    join public.roles r on r.id = mr.role_id
    where mr.membership_id = p_membership_id
      and r.code = 'owner'
  )
$$;

comment on function public.is_membership_owner(uuid) is
  'PR #D2: substitui memberships.is_owner. True se o membership tem a role owner via membership_roles.';

-- ─── 3. Policies: remover refs a is_owner ────────────────────────────────────

-- companies_update_platform_or_owner: substitui 'and is_owner' por exists join
drop policy if exists "companies_update_platform_or_owner" on public.companies;
create policy "companies_update_platform_or_owner" on public.companies
  for update using (
    public.is_platform_admin()
    or exists (
      select 1
      from public.memberships m
      join public.membership_roles mr on mr.membership_id = m.id
      join public.roles r on r.id = mr.role_id
      where m.user_id = auth.uid()
        and m.company_id = companies.id
        and m.status = 'active'
        and r.code = 'owner'
    )
  );

-- memberships_delete_policy: substitui 'not is_owner' por not is_membership_owner
drop policy if exists "memberships_delete" on public.memberships;
create policy "memberships_delete" on public.memberships
  for delete using (
    (
      public.is_platform_admin()
      or public.has_permission(company_id, 'core:member:manage')
    )
    and not public.is_membership_owner(id)
  );

-- invitations cancel logic: substitui target_m.is_owner check
-- (migration 20260504000036_invitations_resets_rls.sql:56)
-- Esta policy é a 'invitations_cancel_by_inviter_or_manager'
drop policy if exists "invitations_cancel_by_inviter_or_manager" on public.company_invitations;
create policy "invitations_cancel_by_inviter_or_manager" on public.company_invitations
  for update using (
    -- Mantém lógica original mas sem dependência de is_owner
    public.is_platform_admin()
    or (
      public.has_permission(company_id, 'core:member:invite')
      and not exists (
        -- Não permite cancelar invite de quem é owner sendo non-admin
        select 1 from public.memberships target_m
        join public.membership_roles mr on mr.membership_id = target_m.id
        join public.roles r on r.id = mr.role_id
        where target_m.user_id = company_invitations.invited_user_id
          and target_m.company_id = company_invitations.company_id
          and r.code = 'owner'
          and not public.is_platform_admin()
      )
    )
  );

-- ─── 4. Triggers/seeds: parar de setar is_owner ──────────────────────────────
-- handle_new_user_default_membership (criado em 020 / 023 / 031): já cria
-- membership com is_owner=false e atribui role 'operator'. Sem mudança aqui.
--
-- Seed da default-company (008): setava is_owner=true para o primeiro user.
-- Backfill da Etapa 1 já garantiu role owner; seed permanece histórico.
--
-- Conclusão: não há trigger ativo que precise ser modificado, pois nenhum
-- novo membership tem is_owner=true criado por código atual. Backfill cobriu
-- legados.

-- ─── 5. Rename column para sinalizar deprecação ──────────────────────────────
alter table public.memberships rename column is_owner to legacy_is_owner;

comment on column public.memberships.legacy_is_owner is
  'PR #D2 DEPRECATED: usar membership_roles + roles.code=''owner''. Coluna mantida por 1 release para rollback rápido; drop em follow-up.';
```

- [ ] **Step 2: Aplicar via MCP** (`name: kill_is_owner_policies`).

- [ ] **Step 3: Validar backfill**

```sql
-- Toda row com legacy_is_owner=true deve ter membership_role apontando para owner
select count(*) filter (where legacy_is_owner = true) as legacy_owners,
       count(*) filter (
         where legacy_is_owner = true
           and is_membership_owner(id)
       ) as backfilled
from memberships;
```

Expected: `legacy_owners = backfilled` (todas migradas).

- [ ] **Step 4: Validar policies recriadas**

```sql
select tablename, policyname, qual, with_check
from pg_policies
where (qual ilike '%legacy_is_owner%' or with_check ilike '%legacy_is_owner%')
  or policyname in ('companies_update_platform_or_owner','memberships_delete','invitations_cancel_by_inviter_or_manager');
```

Expected: policies novas NÃO referenciam `legacy_is_owner`; usam `is_membership_owner()` ou EXISTS join.

- [ ] **Step 5: Validar coluna renomeada**

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='memberships' and column_name in ('is_owner','legacy_is_owner');
```

Expected: 1 row, `legacy_is_owner`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260524000054_kill_is_owner_policies.sql
git commit -m "feat(authz): kill is_owner — owner derives from membership_roles

PR #D2 da evolução de roles. memberships.is_owner deixa de ser fonte
de verdade; passa a ser derivado de membership_roles + roles.code='owner'.

Mudanças:
- Backfill membership_roles para todos os legacy is_owner=true.
- Nova function is_membership_owner(uuid) usada em policies.
- Recria companies_update_platform_or_owner, memberships_delete e
  invitations_cancel_by_inviter_or_manager sem refs a is_owner.
- Renomeia coluna para legacy_is_owner (deprecação visível).
  Drop final em follow-up após estabilização.

TS layer atualizada no commit seguinte para derivar isOwner de roles."
```

---

## Task 2: TS — derive `isOwner` de roles em queries

**Files:**

- Modify: `src/modules/auth/queries/get-current-user.ts`
- Modify: `src/modules/tenancy/queries/list-company-members.ts`

### Step 1: Regen types (necessário antes de editar TS — column foi renomeada)

- [ ] Use `mcp__claude_ai_Supabase__generate_typescript_types` e sobrescreva `src/types/database.types.ts`.

- [ ] Validar: `grep "is_owner\|legacy_is_owner" src/types/database.types.ts | head -10`
      Expected: zero refs a `is_owner`; sim refs a `legacy_is_owner`.

- [ ] Typecheck (vai quebrar nos 4 arquivos TS que ainda referenciam is_owner): `npm run typecheck 2>&1 | head -20`
      Expected: erros em `get-current-user.ts`, `list-company-members.ts`, `update-member-status.ts`, `transfer-member.ts`.

### Step 2: Atualizar `get-current-user.ts`

Substituir o select e o map:

```ts
// Busca memberships com empresa e roles
const { data: rawMemberships } = await supabase
  .from("memberships")
  .select(
    `
      id,
      company_id,
      status,
      company:companies ( slug, name ),
      membership_roles (
        role:roles ( code )
      )
    `,
  )
  .eq("user_id", user.id)
  .eq("status", "active");

const memberships: CompanyMembership[] = (rawMemberships ?? []).map((m) => {
  const company = (m as unknown as { company: { slug: string; name: string } | null }).company;
  const membershipRoles = (
    m as unknown as {
      membership_roles: Array<{ role: { code: string } | null }>;
    }
  ).membership_roles;

  const roleCodes = (membershipRoles ?? []).map((mr) => mr.role?.code ?? "").filter(Boolean);

  return {
    id: m.id,
    companyId: m.company_id,
    companySlug: company?.slug ?? "",
    companyName: company?.name ?? "",
    status: m.status,
    isOwner: roleCodes.includes("owner"),
    roles: roleCodes,
  };
});
```

(Removeu `is_owner` do select; `isOwner` agora é derivado.)

### Step 3: Atualizar `list-company-members.ts`

```ts
const { data: memberships, error: memErr } = await supabase
  .from("memberships")
  .select(
    `
      id,
      user_id,
      status,
      joined_at,
      membership_roles (
        roles ( id, name, code )
      )
    `,
  )
  .eq("company_id", companyId)
  .order("joined_at", { ascending: false });

// ... resto igual ...

return memberships.map((row) => {
  const roles = (row.membership_roles ?? [])
    .map((mr) => mr.roles)
    .filter((r): r is { id: string; name: string; code: string } => r !== null);

  return {
    membershipId: row.id,
    userId: row.user_id,
    fullName: profileMap.get(row.user_id) ?? "—",
    status: row.status,
    isOwner: roles.some((r) => r.code === "owner"),
    joinedAt: row.joined_at,
    roles,
  };
});
```

(Removeu `is_owner` do select; `isOwner` derivado.)

### Step 4: Typecheck partial (vai zerar erros nesses 2 arquivos)

`npm run typecheck 2>&1 | head -15`. Expected: erros restantes apenas em `update-member-status.ts` e `transfer-member.ts`.

### Step 5: Commit

```bash
git add src/types/database.types.ts \
        src/modules/auth/queries/get-current-user.ts \
        src/modules/tenancy/queries/list-company-members.ts
git commit -m "refactor(auth,tenancy): derive isOwner from roles in queries

PR #D2 step. Reads de memberships removem column legacy_is_owner;
isOwner agora computado de roles.some(r => r.code === 'owner').
Idempotente com Task 1 — types regenerados refletem coluna renomeada."
```

---

## Task 3: TS — actions que protegiam owner agora checam via is_membership_owner

**Files:**

- Modify: `src/modules/tenancy/actions/update-member-status.ts`
- Modify: `src/modules/tenancy/actions/transfer-member.ts`
- Modify: `src/modules/tenancy/actions/__tests__/update-member-status.test.ts` (se existir)
- Modify: `src/modules/tenancy/actions/__tests__/transfer-member.test.ts`

### Step 1: Atualizar `update-member-status.ts`

Substituir o select e a guard de owner:

```ts
const { data: membership, error: fetchError } = await supabase
  .from("memberships")
  .select("id, user_id, membership_roles(roles(code))")
  .eq("id", membershipId)
  .eq("company_id", companyId)
  .maybeSingle();

if (fetchError) return { ok: false, message: fetchError.message };
if (!membership) return { ok: false, message: "Membro não encontrado" };

const isOwner = (membership.membership_roles as Array<{ roles: { code: string } | null }>)?.some(
  (mr) => mr.roles?.code === "owner",
);

if (isOwner && (status === "suspended" || status === "removed")) {
  return { ok: false, message: "Não é possível suspender ou remover o proprietário da empresa" };
}
```

### Step 2: Atualizar `transfer-member.ts`

Substituir o select:

```ts
const { data: source, error: srcErr } = await supabase
  .from("memberships")
  .select("id, user_id, membership_roles(role_id, roles(code))")
  .eq("id", membershipId)
  .eq("company_id", sourceCompanyId)
  .maybeSingle();
```

Remover o uso de `source.is_owner` (não existe mais; se houver guard, derive via `source.membership_roles.some(mr => mr.roles?.code === 'owner')`).

Verificar se há gating de owner; se sim, recriar.

### Step 3: Adaptar testes

#### `update-member-status.test.ts`

Se existir teste com fixture `is_owner: true`, trocar por estrutura `membership_roles: [{ roles: { code: 'owner' } }]`.

Padrão de exemplo:

```ts
// Antes
{ id: 'mem-1', user_id: 'u', is_owner: true }
// Depois
{ id: 'mem-1', user_id: 'u', membership_roles: [{ roles: { code: 'owner' } }] }
```

#### `transfer-member.test.ts`

Mesma substituição. Padrão atual usa `is_owner: false` em todos os fixtures — trocar para `membership_roles: []`.

### Step 4: Typecheck + tests

```bash
npm run typecheck
npm run test
```

Expected: zero erros, 596+ tests pass (3 falhas pre-existentes em worktree modulo-anestesia continuam — não regrediram).

### Step 5: Commit

```bash
git add src/modules/tenancy/actions/update-member-status.ts \
        src/modules/tenancy/actions/transfer-member.ts \
        src/modules/tenancy/actions/__tests__/update-member-status.test.ts \
        src/modules/tenancy/actions/__tests__/transfer-member.test.ts
git commit -m "refactor(tenancy): owner guard em actions usa membership_roles

PR #D2 step. update-member-status e transfer-member não leem mais
legacy_is_owner — checam role 'owner' via membership_roles join.
Tests adaptados aos novos shapes de fixture."
```

---

## Task 4: Smoke test manual + validação de regressão

- [ ] **Step 1:** `npm run dev`.

- [ ] **Step 2:** Como platform admin, abrir `/admin/companies/<X>/members` em empresa real. Verificar que owner aparece com badge "owner" e botões Suspender/Remover **não aparecem** para owner (mesma UX de antes).

- [ ] **Step 3:** Tentar suspender owner via curl/dev tools (chamar `updateMemberStatusAction` diretamente). Deve retornar `Não é possível suspender ou remover o proprietário da empresa`.

- [ ] **Step 4:** Criar empresa nova via `/admin/companies/new`. Verificar que first member (owner) recebe role 'owner' via membership_roles. Validar via SQL:

  ```sql
  select m.legacy_is_owner, r.code
  from memberships m
  join membership_roles mr on mr.membership_id = m.id
  join roles r on r.id = mr.role_id
  where m.company_id = '<new-company-id>';
  ```

- [ ] **Step 5:** Verificar que update de empresa (`updateCompanyAction`) ainda funciona quando user é owner (testa `companies_update_platform_or_owner` policy nova).

---

## Task 5: Push + PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/kill-is-owner
```

- [ ] **Step 2: Criar PR**

```bash
gh pr create --base feat/roles-evolution --title "feat(authz): kill is_owner — owner = role pura (PR #D2)" --body "$(cat <<'EOF'
## Summary

PR #D2 da evolução de roles & permissões (spec Fase 1 + 5.1).

\`memberships.is_owner\` deixa de ser fonte de verdade. Owner = role pura via \`membership_roles + roles.code='owner'\`.

### Mudanças DB

- Backfill membership_roles para todos os legacy \`is_owner=true\`.
- Nova function helper \`is_membership_owner(uuid)\` reutilizável.
- 3 policies recriadas sem refs a \`is_owner\`: \`companies_update_platform_or_owner\`, \`memberships_delete\`, \`invitations_cancel_by_inviter_or_manager\`.
- Coluna renomeada para \`legacy_is_owner\` (deprecação visível). Drop em D2-followup após 1 release de estabilização (rollback path).

### Mudanças TS

- \`get-current-user.ts\` e \`list-company-members.ts\` derivam \`isOwner\` de \`roles.some(r => r.code === 'owner')\`.
- \`update-member-status.ts\` e \`transfer-member.ts\` checam owner via \`membership_roles\` join, não column.
- Tests adaptados.
- UI components inalterados (continuam consumindo prop \`isOwner\` — só muda a fonte upstream).

## Dependência

Base: \`feat/roles-evolution\` (PRs #A, #B, #C, #D1).

## Commits

- Migration 054 (backfill + policies + rename)
- TS queries (get-current-user + list-company-members) + types regen
- TS actions (update-member-status + transfer-member) + tests

## Test Plan

- [x] DB: backfill confirmado (legacy_owners == backfilled)
- [x] DB: policies novas sem refs a legacy_is_owner
- [x] DB: coluna renomeada com sucesso
- [x] \`npm run typecheck\` zero erros
- [x] \`npm run test\` 596+ pass (3 falhas pre-existentes em worktree sibling não regrediram)
- [ ] Manual: owner aparece com badge em /admin/companies/<X>/members; Suspender/Remover hidden
- [ ] Manual: tentativa de suspender owner via API bloqueada
- [ ] Manual: empresa nova criada → first user tem role owner
- [ ] Manual: owner edita dados da empresa (testa companies_update policy)

## Não inclui (deferido)

- Drop final da coluna legacy_is_owner (D2-followup após 1 release)
- UI nova (badge "Personalizada", reset button) — D3
- Reformulação /admin/platform/roles → templates UI — D3

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

- Spec coverage (Fase 1 "Mata is_owner"): backfill ✓, policies ✓, TS derive ✓, rename ✓.
- Placeholders: zero TBD/TODO.
- Risk: policies de RLS — manual validation crítica.
- Rollback: revert rename + restaura column refs em código.
- Backward compat: nenhuma — column rename é breaking pra qualquer SQL que ainda leia `is_owner`. Validar via grep que nenhum migration/action/query externo lê esse nome.

## YAGNI (fora desta PR)

- Drop coluna legacy_is_owner.
- Trigger que sincronize legacy_is_owner com membership_roles (não precisa — TS não lê mais).
- UI de templates (D3).
