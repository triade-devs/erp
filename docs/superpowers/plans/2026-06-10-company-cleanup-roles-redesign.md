# Limpeza de Empresas + Redesign de Roles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apagar todas as empresas exceto Default e HC-UFPR (preservando usuários), e substituir as roles por uma taxonomia por módulo × nível com códigos semânticos.

**Architecture:** Mudanças TS trocam os códigos de role fixos (`owner`/`manager`/`operator` → `admin`/`estoque-gestao`/`estoque-operacao`); duas migrations reescrevem os templates de role e o trigger de signup; um script SQL transacional faz a limpeza de dados e recria roles em produção. Spec: `docs/superpowers/specs/2026-06-10-company-cleanup-roles-redesign-design.md`.

**Tech Stack:** Next.js 15 / TypeScript, Supabase Postgres (RLS), vitest, MCP Supabase (`apply_migration`, `execute_sql`) — projeto `jrfyfgpjnswcguvvuxpx` (produção).

**Decisão registrada (delta do spec):** `prontuario-leitura` recebe, além de `medical:patient:read_assigned`, os reads do prontuário (`medical:anamnesis:read`, `medical:consultation:read`, `medical:prescription:read`, `medical:consent:read`, `medical:attachment:read`) — sem isso a role veria pacientes sem conseguir abrir nada. Aprovação implícita do "Prontuário — Leitura"; reverter é trivial (remover 5 inserts).

**⚠️ Bug latente corrigido no Task 3:** em `toggle-module.ts`, role de sistema sem branch no mapeamento cai no filtro default "todas as ações" e ganharia permissões totais do módulo. Como `estoque-leitura`/`kb-editor` serão roles de sistema, o novo código PULA roles fora do mapa.

---

## Pré-requisitos

- Branch de trabalho atual (`claude/adoring-heisenberg-m7cnwz`) ou nova branch a partir de `main`.
- Acesso MCP Supabase ao projeto `jrfyfgpjnswcguvvuxpx`.
- Tarefas 1–7 são locais (código/arquivos). Tarefas 8–10 tocam produção — executar em sequência, sem paralelismo.

---

### Task 1: `isOwner` passa a checar código `admin`

**Files:**

- Modify: `src/modules/auth/queries/get-current-user.ts:12,65`
- Modify: `src/modules/tenancy/queries/list-company-members.ts:56`

- [ ] **Step 1: Editar `get-current-user.ts`**

Linha 12 (comentário do tipo):

```ts
  roles: string[]; // códigos dos roles, ex: ['admin', 'estoque-gestao']
```

Linha 65:

```ts
      isOwner: roleCodes.includes("admin"),
```

- [ ] **Step 2: Editar `list-company-members.ts`**

Linha 56:

```ts
      isOwner: roles.some((r) => r.code === "admin"),
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck && npm test`
Expected: typecheck OK; testes existentes passam (nenhum testa esses dois arquivos por código de role).

- [ ] **Step 4: Commit**

```bash
rtk git add src/modules/auth/queries/get-current-user.ts src/modules/tenancy/queries/list-company-members.ts
rtk git commit -m "refactor(authz): isOwner passa a checar role de codigo admin"
```

---

### Task 2: `create-company.ts` atribui `admin` ao criador

**Files:**

- Modify: `src/modules/tenancy/actions/create-company.ts:102-108`

- [ ] **Step 1: Editar o lookup da role do convite de owner**

Trocar (linhas 102–108):

```ts
// Busca role owner da empresa recém-criada
const { data: ownerRole } = await supabase
  .from("roles")
  .select("id")
  .eq("company_id", companyId)
  .eq("code", "owner")
  .maybeSingle();
```

por:

```ts
// Busca role admin da empresa recém-criada
const { data: ownerRole } = await supabase
  .from("roles")
  .select("id")
  .eq("company_id", companyId)
  .eq("code", "admin")
  .maybeSingle();
```

(O nome da variável `ownerRole` pode ficar; o convite continua sendo "do owner" conceitualmente.)

- [ ] **Step 2: Verificar**

Run: `npm run typecheck && npm test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
rtk git add src/modules/tenancy/actions/create-company.ts
rtk git commit -m "refactor(tenancy): create-company atribui role admin ao criador"
```

---

### Task 3: `toggle-module.ts` — novo mapeamento + skip de roles fora do mapa

**Files:**

- Modify: `src/modules/tenancy/actions/toggle-module.ts:65-92`
- Modify: `src/modules/tenancy/actions/__tests__/toggle-module.test.ts`

- [ ] **Step 1: Atualizar fixtures do teste para os novos códigos**

Em `toggle-module.test.ts`, substituir em TODO o arquivo (fixtures nas linhas ~41-43, ~256, ~273 e quaisquer outras ocorrências):

- `code: "owner"` → `code: "admin"`
- `code: "manager"` → `code: "estoque-gestao"`
- `code: "operator"` → `code: "estoque-operacao"`
- ids de fixture `"role-owner"` → `"role-admin"`, `"role-owner-id"` → `"role-admin-id"` (se existirem `role-manager`/`role-operator`, renomear para `role-gestao`/`role-operacao`)

Conferir com: `rtk grep -n "owner\|manager\|operator" src/modules/tenancy/actions/__tests__/toggle-module.test.ts` — não deve sobrar referência a códigos antigos (exceto texto livre sem relação com `roles.code`).

- [ ] **Step 2: Rodar testes para ver falhar**

Run: `npm test -- toggle-module`
Expected: FAIL — implementação ainda usa códigos antigos.

- [ ] **Step 3: Atualizar implementação**

Em `toggle-module.ts`, trocar o bloco das linhas 65–92:

```ts
for (const role of systemRoles ?? []) {
  let actionsFilter: string[] = [];
  if (role.code === "owner") {
    // owner ganha tudo
  } else if (role.code === "manager") {
    actionsFilter = ["read", "create", "update", "delete", "export", "approve"];
  } else if (role.code === "operator") {
    actionsFilter = ["read", "create"];
  }

  const { data: perms } = await supabase
    .from("permissions")
    .select("code")
    .eq("module_code", moduleCode)
    .in(
      "action",
      actionsFilter.length
        ? actionsFilter
        : ["read", "create", "update", "delete", "export", "approve", "cancel"],
    );

  if (perms?.length) {
    await supabase.from("role_permissions").upsert(
      perms.map((p) => ({ role_id: role.id, permission_code: p.code, is_active: true })),
      { onConflict: "role_id,permission_code", ignoreDuplicates: true },
    );
  }
}
```

por:

```ts
// Ações concedidas por código de role ao habilitar um módulo.
// Roles fora do mapa (ex.: estoque-leitura, kb-editor) NÃO recebem
// perms automáticas — são gerenciadas manualmente pela UI de roles.
const roleActionFilters: Record<string, string[]> = {
  admin: ["read", "create", "update", "delete", "export", "approve", "cancel"],
  "estoque-gestao": ["read", "create", "update", "delete", "export", "approve"],
  "estoque-operacao": ["read", "create"],
};

for (const role of systemRoles ?? []) {
  const actionsFilter = roleActionFilters[role.code];
  if (!actionsFilter) continue;

  const { data: perms } = await supabase
    .from("permissions")
    .select("code")
    .eq("module_code", moduleCode)
    .in("action", actionsFilter);

  if (perms?.length) {
    await supabase.from("role_permissions").upsert(
      perms.map((p) => ({ role_id: role.id, permission_code: p.code, is_active: true })),
      { onConflict: "role_id,permission_code", ignoreDuplicates: true },
    );
  }
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- toggle-module`
Expected: PASS. Se algum teste assumia que role desconhecida recebe o filtro default, ajustar a EXPECTATIVA do teste para o novo comportamento (skip) — o comportamento novo é o correto.

- [ ] **Step 5: Commit**

```bash
rtk git add src/modules/tenancy/actions/toggle-module.ts src/modules/tenancy/actions/__tests__/toggle-module.test.ts
rtk git commit -m "refactor(tenancy): toggle-module usa novos codigos de role e pula roles fora do mapa"
```

---

### Task 4: `bulk-toggle-module-for-companies.ts` — novo mapeamento

**Files:**

- Modify: `src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts:8-10,69-81`
- Modify: `src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts`

- [ ] **Step 1: Atualizar fixtures do teste**

Mesmas substituições do Task 3 Step 1, em `bulk-toggle-module-for-companies.test.ts` (fixture na linha ~156: `{ id: "role-owner", code: "owner" }` → `{ id: "role-admin", code: "admin" }`, e demais ocorrências).

- [ ] **Step 2: Rodar testes para ver falhar**

Run: `npm test -- bulk-toggle`
Expected: FAIL.

- [ ] **Step 3: Atualizar implementação**

Trocar as constantes (linhas 8–10):

```ts
const ADMIN_ACTIONS = ["read", "create", "update", "delete", "export", "approve", "cancel"];
const GESTAO_ACTIONS = ["read", "create", "update", "delete", "export", "approve"];
const OPERACAO_ACTIONS = ["read", "create"];
```

E o bloco de distribuição (linhas ~69–81):

```ts
const adminPerms = permsByAction(ADMIN_ACTIONS);
const gestaoPerms = permsByAction(GESTAO_ACTIONS);
const operacaoPerms = permsByAction(OPERACAO_ACTIONS);

const rpRows: { role_id: string; permission_code: string; is_active: boolean }[] = [];
for (const role of systemRoles ?? []) {
  let perms: string[] = [];
  if (role.code === "admin") perms = adminPerms;
  else if (role.code === "estoque-gestao") perms = gestaoPerms;
  else if (role.code === "estoque-operacao") perms = operacaoPerms;
  for (const perm of perms)
    rpRows.push({ role_id: role.id, permission_code: perm, is_active: true });
}
```

(Roles fora do mapa já ficam com `perms = []` — comportamento seguro mantido.)

- [ ] **Step 4: Rodar testes**

Run: `npm test -- bulk-toggle`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/modules/tenancy/actions/bulk-toggle-module-for-companies.ts src/modules/tenancy/actions/__tests__/bulk-toggle-module-for-companies.test.ts
rtk git commit -m "refactor(tenancy): bulk-toggle usa novos codigos de role"
```

---

### Task 5: Migration — novos role templates

**Files:**

- Create: `supabase/migrations/20260610000049_new_role_templates.sql`

- [ ] **Step 1: Criar o arquivo com este conteúdo exato**

```sql
-- 20260610000049_new_role_templates.sql
-- Redesign de roles (spec 2026-06-10): substitui templates owner/manager/operator
-- pela taxonomia por módulo × nível. roles.template_code das instâncias antigas
-- vira NULL (FK on delete set null) — as instâncias são recriadas pelo script
-- de dados scripts/2026-06-10-company-cleanup-roles.sql.

-- 1. Remove templates antigos (cascade em template_permissions)
delete from public.role_templates where code in ('owner', 'manager', 'operator');

-- 2. Novos templates
insert into public.role_templates (code, name, description, is_system, sort_order) values
  ('admin',            'Admin',                          'Acesso total à empresa',                                  true, 10),
  ('estoque-gestao',   'Gestão de Estoque',              'Gestão completa de produtos, movimentos e fornecedores',  true, 20),
  ('estoque-operacao', 'Operação de Estoque',            'Registra movimentos e consulta produtos e fornecedores',  true, 30),
  ('estoque-leitura',  'Leitura de Estoque',             'Somente leitura de estoque',                              true, 40),
  ('kb-editor',        'Editor da Base de Conhecimento', 'Escreve e publica artigos da base de conhecimento',       true, 50)
on conflict (code) do nothing;

-- 3. Hierarquia: admin é pai de todas (can_manage_role permite admin gerenciar)
update public.role_templates set parent_template_code = 'admin'
 where code in ('estoque-gestao', 'estoque-operacao', 'estoque-leitura', 'kb-editor');

-- 4. Permissões dos templates
-- admin: todas as permissões do catálogo atual.
-- Limitação conhecida (igual ao modelo antigo): perms de módulos futuros não
-- entram retroativamente no template; toggle-module cobre a concessão na ativação.
insert into public.template_permissions (template_code, permission_code)
select 'admin', code from public.permissions
on conflict do nothing;

insert into public.template_permissions (template_code, permission_code)
select 'estoque-gestao', code from public.permissions
where module_code in ('inventory', 'movements', 'suppliers')
on conflict do nothing;

insert into public.template_permissions (template_code, permission_code) values
  ('estoque-operacao', 'movements:movement:create'),
  ('estoque-operacao', 'movements:movement:read'),
  ('estoque-operacao', 'inventory:product:read'),
  ('estoque-operacao', 'suppliers:supplier:read'),
  ('estoque-leitura',  'inventory:product:read'),
  ('estoque-leitura',  'movements:movement:read'),
  ('estoque-leitura',  'suppliers:supplier:read')
on conflict do nothing;

insert into public.template_permissions (template_code, permission_code)
select 'kb-editor', code from public.permissions
where module_code = 'knowledge-base'
on conflict do nothing;
```

- [ ] **Step 2: Commit**

```bash
rtk git add supabase/migrations/20260610000049_new_role_templates.sql
rtk git commit -m "feat(authz): templates de role por modulo x nivel (admin, estoque-*, kb-editor)"
```

---

### Task 6: Migration — signup atribui `estoque-leitura`

**Files:**

- Create: `supabase/migrations/20260610000050_signup_assigns_estoque_leitura.sql`

- [ ] **Step 1: Criar o arquivo com este conteúdo exato**

(Reescreve a function inteira da 055, mudando apenas a role atribuída.)

```sql
-- 20260610000050_signup_assigns_estoque_leitura.sql
-- Redesign de roles (spec 2026-06-10): novos signups recebem 'estoque-leitura'
-- na empresa padrão (antes: 'operator', que deixa de existir).

create or replace function public.handle_new_user_default_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_company_id uuid;
  v_membership_id      uuid;
  v_default_role_id    uuid;
begin
  -- 1. Cria ou ignora o profile público do usuário
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- 2. Busca a empresa padrão
  select id into v_default_company_id
  from public.companies
  where slug = 'default-company'
  limit 1;

  if v_default_company_id is null then
    return new;
  end if;

  -- 3. Cria membership como active
  insert into public.memberships (user_id, company_id, status, joined_at)
  values (new.id, v_default_company_id, 'active', now())
  on conflict (user_id, company_id) do nothing
  returning id into v_membership_id;

  if v_membership_id is null then
    return new;
  end if;

  -- 4. Atribui role 'estoque-leitura' da empresa padrão (se existir)
  select id into v_default_role_id
  from public.roles
  where company_id = v_default_company_id
    and code = 'estoque-leitura'
  limit 1;

  if v_default_role_id is not null then
    insert into public.membership_roles (membership_id, role_id)
    values (v_membership_id, v_default_role_id)
    on conflict do nothing;
  end if;

  return new;
end $$;
```

- [ ] **Step 2: Commit**

```bash
rtk git add supabase/migrations/20260610000050_signup_assigns_estoque_leitura.sql
rtk git commit -m "feat(auth): signup atribui estoque-leitura em vez de operator"
```

---

### Task 7: Script de dados — limpeza + recriação de roles

**Files:**

- Create: `scripts/2026-06-10-company-cleanup-roles.sql`

- [ ] **Step 1: Criar o arquivo com este conteúdo exato**

```sql
-- 2026-06-10-company-cleanup-roles.sql
-- Spec: docs/superpowers/specs/2026-06-10-company-cleanup-roles-redesign-design.md
-- Executar UMA vez em produção, DEPOIS das migrations 049/050.
-- Tudo em uma transação; asserts no final abortam em caso de inconsistência.

begin;

-- ─── 0. Backup lógico das tabelas afetadas ──────────────────────────────────
create schema if not exists backup_20260610;
create table backup_20260610.companies        as table public.companies;
create table backup_20260610.roles            as table public.roles;
create table backup_20260610.role_permissions as table public.role_permissions;
create table backup_20260610.memberships      as table public.memberships;
create table backup_20260610.membership_roles as table public.membership_roles;

-- ─── 1. Captura atribuições atuais das empresas mantidas ────────────────────
create temp table old_assignments on commit drop as
select m.user_id, m.company_id, r.code as old_code
from public.membership_roles mr
join public.memberships m on m.id = mr.membership_id
join public.roles r       on r.id = mr.role_id
join public.companies c   on c.id = m.company_id
where c.slug in ('default-company', 'hc-ufpr');

-- ─── 2. Órfãos: usuários cujas memberships estão todas em empresas a apagar ─
create temp table orphan_users on commit drop as
select distinct m.user_id
from public.memberships m
where m.user_id not in (
  select m2.user_id
  from public.memberships m2
  join public.companies c2 on c2.id = m2.company_id
  where c2.slug in ('default-company', 'hc-ufpr')
);

insert into public.memberships (user_id, company_id, status, joined_at)
select o.user_id, c.id, 'active', now()
from orphan_users o
cross join (select id from public.companies where slug = 'default-company') c
on conflict (user_id, company_id) do nothing;

-- ─── 3. Apaga as demais empresas (cascade limpa dados relacionados) ─────────
delete from public.companies
where slug not in ('default-company', 'hc-ufpr');

-- ─── 4. Revoga convites pendentes das empresas mantidas ─────────────────────
-- (role_ids uuid[] apontaria para roles apagadas no passo 5)
update public.company_invitations
set status = 'revoked', revoked_at = now()
where status = 'pending';

-- ─── 5. Apaga roles das empresas mantidas ───────────────────────────────────
-- (cascade limpa role_permissions, membership_roles, role_scopes, role_field_rules)
delete from public.roles;

-- ─── 6. Recria roles ────────────────────────────────────────────────────────
-- Default: admin, estoque-gestao, estoque-operacao, estoque-leitura, kb-editor
-- HC-UFPR: admin, prontuario-medico, prontuario-leitura, anestesia
-- trigger check_role_hierarchy seta hierarchy_level a partir de parent_role_id.

-- 6a. admin nas duas empresas (nível 0)
insert into public.roles (company_id, code, name, description, is_system, template_code, template_synced_at)
select c.id, 'admin', 'Admin', 'Acesso total à empresa', true, 'admin', now()
from public.companies c
where c.slug in ('default-company', 'hc-ufpr');

-- 6b. demais roles da Default (filhas de admin)
insert into public.roles (company_id, code, name, description, is_system, template_code, template_synced_at, parent_role_id)
select c.id, t.code, t.name, t.description, true, t.code, now(), a.id
from public.companies c
join public.roles a on a.company_id = c.id and a.code = 'admin'
join public.role_templates t on t.code in ('estoque-gestao', 'estoque-operacao', 'estoque-leitura', 'kb-editor')
where c.slug = 'default-company';

-- 6c. roles custom do HC-UFPR (filhas de admin, sem template)
insert into public.roles (company_id, code, name, description, is_system, parent_role_id)
select c.id, v.code, v.name, v.description, false, a.id
from public.companies c
join public.roles a on a.company_id = c.id and a.code = 'admin'
cross join (values
  ('prontuario-medico',  'Prontuário — Médico',  'Cria e edita prontuários dos pacientes atribuídos'),
  ('prontuario-leitura', 'Prontuário — Leitura', 'Leitura dos prontuários dos pacientes atribuídos'),
  ('anestesia',          'Anestesia',            'Fichas de anestesia')
) as v(code, name, description)
where c.slug = 'hc-ufpr';

-- ─── 7. Permissões das roles ────────────────────────────────────────────────
-- admin: tudo
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r cross join public.permissions p
where r.code = 'admin';

-- roles instanciadas de template (Default): herdam template_permissions
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, tp.permission_code, true
from public.roles r
join public.template_permissions tp on tp.template_code = r.template_code
where r.code in ('estoque-gestao', 'estoque-operacao', 'estoque-leitura', 'kb-editor')
on conflict do nothing;

-- prontuario-medico
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r
join public.permissions p on p.code in (
  'medical:patient:read_assigned', 'medical:patient:create', 'medical:patient:update',
  'medical:anamnesis:read',        'medical:anamnesis:write',
  'medical:consultation:read',     'medical:consultation:write',
  'medical:prescription:read',     'medical:prescription:write',
  'medical:consent:read',          'medical:consent:accept',
  'medical:attachment:read'
)
where r.code = 'prontuario-medico';

-- prontuario-leitura (read_assigned + reads do prontuário — ver delta no plano)
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r
join public.permissions p on p.code in (
  'medical:patient:read_assigned',
  'medical:anamnesis:read', 'medical:consultation:read',
  'medical:prescription:read', 'medical:consent:read', 'medical:attachment:read'
)
where r.code = 'prontuario-leitura';

-- anestesia
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r
join public.permissions p on p.code in ('anestesia:ficha:read', 'anestesia:ficha:write')
where r.code = 'anestesia';

-- ─── 8. Reatribui usuários (mapeamento old → new, por empresa) ──────────────
insert into public.membership_roles (membership_id, role_id)
select distinct m.id, r.id
from old_assignments a
join (values
  ('owner',     'admin'),
  ('manager',   'estoque-gestao'),
  ('operator',  'estoque-operacao'),
  ('docs',      'kb-editor'),
  ('anestesia', 'anestesia')
) as map(old_code, new_code) on map.old_code = a.old_code
join public.roles r       on r.company_id = a.company_id and r.code = map.new_code
join public.memberships m on m.user_id = a.user_id and m.company_id = a.company_id
on conflict do nothing;

-- órfãos revinculados → estoque-leitura na Default
insert into public.membership_roles (membership_id, role_id)
select m.id, r.id
from orphan_users o
join public.companies c   on c.slug = 'default-company'
join public.memberships m on m.user_id = o.user_id and m.company_id = c.id
join public.roles r       on r.company_id = c.id and r.code = 'estoque-leitura'
on conflict do nothing;

-- ─── 9. Asserts: aborta a transação se algo ficou inconsistente ─────────────
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.companies;
  if v_count <> 2 then
    raise exception 'esperava 2 empresas, achei %', v_count;
  end if;

  select count(*) into v_count
  from public.memberships m
  where m.status = 'active'
    and not exists (select 1 from public.membership_roles mr where mr.membership_id = m.id);
  if v_count > 0 then
    raise exception '% memberships ativas sem nenhuma role', v_count;
  end if;

  select count(*) into v_count from public.roles where code = 'admin';
  if v_count <> 2 then
    raise exception 'esperava 2 roles admin (1 por empresa), achei %', v_count;
  end if;

  select count(*) into v_count
  from public.roles r
  where not exists (select 1 from public.role_permissions rp where rp.role_id = r.id);
  if v_count > 0 then
    raise exception '% roles sem nenhuma permissão', v_count;
  end if;
end $$;

commit;
```

- [ ] **Step 2: Commit**

```bash
rtk git add scripts/2026-06-10-company-cleanup-roles.sql
rtk git commit -m "feat(scripts): limpeza de empresas e recriacao de roles (spec 2026-06-10)"
```

---

### Task 8: Aplicar migrations em produção (MCP)

⚠️ A partir daqui toca produção. Pré-condição: Tasks 1–7 commitadas, `npm run typecheck && npm test` verdes.

- [ ] **Step 1: Aplicar migration 049**

Via MCP `mcp__claude_ai_Supabase__apply_migration` com `project_id: jrfyfgpjnswcguvvuxpx`, `name: new_role_templates`, `query`: conteúdo exato de `supabase/migrations/20260610000049_new_role_templates.sql`.

- [ ] **Step 2: Aplicar migration 050**

Idem, `name: signup_assigns_estoque_leitura`, `query`: conteúdo de `supabase/migrations/20260610000050_signup_assigns_estoque_leitura.sql`.

- [ ] **Step 3: Verificar templates**

Via MCP `execute_sql`:

```sql
select code, parent_template_code,
  (select count(*) from template_permissions tp where tp.template_code = rt.code) as perms
from role_templates rt order by sort_order;
```

Expected: 5 linhas — admin (parent null, 53 perms), estoque-gestao (admin, 12), estoque-operacao (admin, 4), estoque-leitura (admin, 3), kb-editor (admin, 5). (53 = total atual do catálogo; conferir com `select count(*) from permissions`.)

---

### Task 9: Executar o script de dados em produção (MCP)

- [ ] **Step 1: Executar**

Via MCP `execute_sql` com o conteúdo COMPLETO de `scripts/2026-06-10-company-cleanup-roles.sql` em uma única chamada (a transação `begin/commit` está no script; os asserts abortam tudo em caso de problema). Se a API reclamar de transação aninhada (ela pode envolver o batch numa transação própria), remover apenas as linhas `begin;` e `commit;` na chamada — o batch único continua atômico e o `on commit drop` das temp tables segue válido.

Executar imediatamente após o Task 8: entre as migrations e este script, um signup novo ficaria sem role (`estoque-leitura` ainda não existe nesse intervalo).

Expected: sucesso sem exception. Se falhar com exception de assert, NADA foi alterado (rollback automático) — investigar antes de reexecutar.

- [ ] **Step 2: Conferir resultado imediato**

```sql
select c.slug, r.code, r.is_system, r.hierarchy_level,
  (select count(*) from role_permissions rp where rp.role_id = r.id) as perms,
  (select count(*) from membership_roles mr where mr.role_id = r.id) as users
from roles r join companies c on c.id = r.company_id
order by c.slug, r.hierarchy_level, r.code;
```

Expected: 9 linhas — Default: admin(0), estoque-gestao(1), estoque-operacao(1), estoque-leitura(1), kb-editor(1); HC-UFPR: admin(0), anestesia(1), prontuario-leitura(1), prontuario-medico(1). Todos `perms > 0`. `users`: Default admin=4, estoque-gestao=4, estoque-operacao=3, kb-editor=2; HC admin=2, anestesia=1 (mesma distribuição capturada antes; manager/operator do HC caem por não ter equivalente).

---

### Task 10: Verificação final

- [ ] **Step 1: Verificações SQL**

```sql
-- 2 empresas
select slug from companies order by slug;
-- nenhuma membership ativa sem role
select count(*) from memberships m
where m.status='active'
  and not exists (select 1 from membership_roles mr where mr.membership_id = m.id);
-- órfãos revinculados: todo usuário que tinha membership antes ainda tem
select count(*) from backup_20260610.memberships b
where not exists (select 1 from memberships m where m.user_id = b.user_id);
```

Expected: `default-company` + `hc-ufpr`; 0; 0.

- [ ] **Step 2: Suite local**

Run: `npm run typecheck && npm run lint && npm test`
Expected: tudo verde.

- [ ] **Step 3: Smoke test manual (usuário)**

Pedir ao usuário para validar no app (RLS falha silenciosamente — só o login real prova):

1. Login com usuário admin da Default → vê produtos, gerencia membros.
2. Login com usuário não-admin → vê o que a role permite e nada além.
3. (Opcional) signup novo → entra na Default com `estoque-leitura`.

- [ ] **Step 4: Push + PR**

```bash
rtk git push -u origin HEAD
```

Abrir PR com `gh pr create` resumindo: redesign de roles + limpeza de dados (script já executado), migrations 049/050 já aplicadas via MCP (histórico remoto registrado — `db push` futuro não tenta reaplicar).

---

## Rollback

- Script de dados: restaurar do schema `backup_20260610` (companies/roles/role_permissions/memberships/membership_roles) — os dados cascateados das empresas apagadas (produtos, movimentos etc.) NÃO têm backup neste schema; o ponto de não-retorno é o Task 9. Se precisar de rollback completo, usar PITR do Supabase.
- Migrations 049/050: reverter exige recriar templates antigos (conteúdo em `backup` não cobre templates; usar git history da 052) — improvável de precisar.
- Após validação OK (alguns dias), dropar o schema: `drop schema backup_20260610 cascade;`
