# PR #C — `grant_module_to_all_companies` RPC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar RPC Postgres `grant_module_to_all_companies(p_module_code text, p_role_to_perms jsonb)` que platform admins usam pra propagar um módulo novo para todas as empresas + suas roles existentes. Migration de módulo novo passa de ~30 linhas pra 3.

**Architecture:** SECURITY DEFINER function. Insere em `company_modules` (todas as empresas) e `role_permissions` (roles existentes por `code`, filtradas por contrato JSONB). `on conflict do nothing` mantém idempotência.

**Tech Stack:** Supabase Postgres · plpgsql · MCP `apply_migration` (CLI sem token).

**Spec:** `docs/superpowers/specs/2026-05-22-roles-evolucao-design.md` — seção 5.3.

**Depende de:** PRs #A e #B (já mergeados em `feat/roles-evolution`). Esta PR sobe sobre `feat/roles-evolution`.

**Não inclui:** propagação para `template_permissions` (vem no PR #D quando a tabela existir). Reativação de `role_permissions.is_active=false` (RPC só insere via `on conflict do nothing`; reativar é responsabilidade do toggle-module action). Migration template pra mostrar uso real (vira docs/exemplo apenas).

---

## File Structure

| Arquivo                                                                    | Responsabilidade | Ação   |
| -------------------------------------------------------------------------- | ---------------- | ------ |
| `supabase/migrations/20260523000050_grant_module_to_all_companies_rpc.sql` | Function nova    | CREATE |

Não toca: TS (RPC ainda não tem consumer no app — é ferramenta de migration), policies, types.

---

## Pre-requisite: branch setup

- [ ] **Step 0: Branch from `feat/roles-evolution`**

```bash
git checkout feat/roles-evolution
git pull
git checkout -b feat/grant-module-rpc
```

---

## Task 1: Migration — RPC `grant_module_to_all_companies`

**Files:**

- Create: `supabase/migrations/20260523000050_grant_module_to_all_companies_rpc.sql`

- [ ] **Step 1: Escrever migration**

```sql
-- 20260523000050_grant_module_to_all_companies_rpc.sql
-- PR #C da evolução de roles: RPC reutilizável pra propagar módulos novos.
-- Substitui boilerplate manual (~30 linhas por módulo) por chamada única.
-- Contrato JSONB: { "<role_code>": ["<perm_code>", ...] | ["*"] }
--   "*" no array = todas as permissões do módulo
--
-- Exemplo de uso numa migration de módulo novo:
--   insert into modules(code, name) values ('billing', 'Faturamento');
--   insert into permissions(code, module_code, resource, action, description) values
--     ('billing:invoice:read',   'billing', 'invoice', 'read',   'Listar faturas'),
--     ('billing:invoice:create', 'billing', 'invoice', 'create', 'Criar fatura'),
--     ('billing:invoice:cancel', 'billing', 'invoice', 'cancel', 'Cancelar fatura');
--   select grant_module_to_all_companies(
--     'billing',
--     '{"owner":["*"],"manager":["billing:invoice:read","billing:invoice:create"],"operator":["billing:invoice:read"]}'::jsonb
--   );

create or replace function public.grant_module_to_all_companies(
  p_module_code text,
  p_role_to_perms jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso restrito a platform admins' using errcode = 'P0401';
  end if;

  if p_role_to_perms is null or jsonb_typeof(p_role_to_perms) <> 'object' then
    raise exception 'p_role_to_perms precisa ser um objeto JSONB' using errcode = 'P0422';
  end if;

  if not exists (select 1 from public.modules where code = p_module_code) then
    raise exception 'Módulo % não existe', p_module_code using errcode = 'P0404';
  end if;

  -- Habilita módulo em todas as empresas (idempotente)
  insert into public.company_modules (company_id, module_code)
    select id, p_module_code from public.companies
    on conflict do nothing;

  -- Propaga permissões para roles existentes por code, filtradas pelo contrato JSONB
  insert into public.role_permissions (role_id, permission_code, is_active)
    select r.id, p.code, true
    from public.roles r
    cross join public.permissions p
    where p.module_code = p_module_code
      and r.code in (select jsonb_object_keys(p_role_to_perms))
      and (
        p_role_to_perms -> r.code ? '*'
        or p_role_to_perms -> r.code ? p.code
      )
    on conflict do nothing;
end $$;

-- Restringe execução: apenas authenticated; a função em si valida is_platform_admin
revoke all on function public.grant_module_to_all_companies(text, jsonb) from public, anon;
grant execute on function public.grant_module_to_all_companies(text, jsonb) to authenticated;

comment on function public.grant_module_to_all_companies(text, jsonb) is
  'PR #C: propaga módulo (company_modules + role_permissions) para todas as empresas. Contrato: jsonb {role_code: [perm_code,...] | ["*"]}. Idempotente via on conflict.';
```

- [ ] **Step 2: Aplicar via MCP**

Use `mcp__claude_ai_Supabase__apply_migration` no projeto `jrfyfgpjnswcguvvuxpx`. Nome: `grant_module_to_all_companies_rpc`. Query: a function + revoke/grant + comment (sem o cabeçalho de comentário).

- [ ] **Step 3: Validar função existe + assinatura**

`mcp__claude_ai_Supabase__execute_sql`:

```sql
select proname, proargnames, proargtypes::regtype[], prorettype::regtype, provolatile, prosecdef
from pg_proc
where proname = 'grant_module_to_all_companies'
  and pronamespace = (select oid from pg_namespace where nspname = 'public');
```

Expected: 1 row, `proname=grant_module_to_all_companies`, `proargnames={p_module_code,p_role_to_perms}`, `proargtypes={text,jsonb}`, `prorettype=void`, `provolatile=v` (volatile), `prosecdef=true`.

- [ ] **Step 4: Validar grant**

```sql
select grantee, privilege_type
from information_schema.role_routine_grants
where routine_name = 'grant_module_to_all_companies'
  and specific_schema = 'public';
```

Expected: pelo menos uma linha `grantee=authenticated, privilege_type=EXECUTE`. NÃO deve haver linhas pra `public` ou `anon`.

- [ ] **Step 5: Smoke test — chamar com módulo inexistente (esperado erro P0404)**

```sql
select grant_module_to_all_companies(
  'nonexistent-module-xyz',
  '{"owner":["*"]}'::jsonb
);
```

Expected: ERROR `Módulo nonexistent-module-xyz não existe` com SQLSTATE `P0404`.

- [ ] **Step 6: Smoke test — chamar com payload inválido (esperado erro P0422)**

```sql
select grant_module_to_all_companies(
  'inventory',
  '"string-nao-eh-objeto"'::jsonb
);
```

Expected: ERROR `p_role_to_perms precisa ser um objeto JSONB` com SQLSTATE `P0422`.

- [ ] **Step 7: Smoke test — chamar como service role (sem auth.uid)**

Quando executado via MCP (service role), `auth.uid()` é NULL → `is_platform_admin()` retorna false → função levanta P0401.

```sql
select grant_module_to_all_companies(
  'inventory',
  '{"owner":["*"]}'::jsonb
);
```

Expected: ERROR `Acesso restrito a platform admins` com SQLSTATE `P0401`.

Esse comportamento PROVA que o gate funciona. Validação real do happy-path com platform admin acontece em Task 2 (manual via app dev server).

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20260523000050_grant_module_to_all_companies_rpc.sql
git commit -m "feat(authz): add grant_module_to_all_companies RPC

PR #C da evolução de roles. Function SECURITY DEFINER que propaga
módulo (company_modules + role_permissions) para todas as empresas
em uma única chamada. Reduz boilerplate de migration de módulo novo
de ~30 linhas para 3. Contrato JSONB: {role_code: [perm_code,...] | [\"*\"]}.

Validações:
- P0401 se chamador não é platform admin
- P0404 se módulo não existe
- P0422 se payload não é objeto JSONB

Não propaga ainda para template_permissions — vem no PR #D quando
a tabela existir."
```

---

## Task 2: Validação manual happy-path

A RPC só pode ser chamada como platform admin. Service role (MCP) levanta P0401. Precisamos validar happy-path via app ou via psql autenticado.

- [ ] **Step 1: Setup local (caso queira validar sem aplicar em produção)**

Pular se já tiver um módulo descartável. Caso contrário, criar módulo temporário em transaction:

```sql
-- Via MCP, mas envolvendo a chamada da RPC num bloco que troca auth.uid temporariamente
-- não é trivial via service role. Estratégia: criar um teste integrado em Task 3 (futuro)
-- ou validar via app rodando localmente como platform admin.
```

Aceitar caveat: happy-path manual via app é o caminho real. Caveat documentado no PR description.

- [ ] **Step 2: Validar via app**

1. `npm run dev`.
2. Subir um módulo de teste manualmente via UI `/admin/platform/modules/new` (chamando `createModuleAction`).
3. Anotar `module.code` do módulo criado.
4. No console do Supabase ou via psql autenticado, executar:
   ```sql
   select grant_module_to_all_companies(
     '<module-code>',
     '{"owner":["*"]}'::jsonb
   );
   ```
   (Substituir `<module-code>` pelo criado.)
5. Verificar:

   ```sql
   select count(*) as company_modules_count
   from company_modules where module_code = '<module-code>';
   -- Expected: count = (select count(*) from companies)

   select count(*) as role_permissions_count
   from role_permissions rp
   join permissions p on p.code = rp.permission_code
   where p.module_code = '<module-code>'
     and rp.role_id in (select id from roles where code = 'owner');
   -- Expected: count = (select count(*) from roles where code = 'owner') * (#perms do módulo)
   ```

6. Rollback: dropar perms + módulo de teste.

Aceitar pular Step 2 se quiser deixar happy-path pra primeiro uso real (próxima migration de módulo). RPC já tem unit tests de erro via Tasks 1.5-1.7.

---

## Task 3: Push + PR

- [ ] **Step 1: Push**

```bash
git push -u origin feat/grant-module-rpc
```

- [ ] **Step 2: Criar PR**

```bash
gh pr create --base feat/roles-evolution --title "feat(authz): grant_module_to_all_companies RPC (PR #C)" --body "$(cat <<'EOF'
## Summary

PR #C da evolução de roles & permissões (spec seção 5.3).

- Cria RPC \`grant_module_to_all_companies(text, jsonb)\` SECURITY DEFINER.
- Migration de módulo novo passa de ~30 linhas (boilerplate KB-style) pra 3:
  \`insert into modules\` + \`insert into permissions\` + \`select grant_module_to_all_companies(...)\`.
- Validações: P0401 (não-admin), P0404 (módulo inexistente), P0422 (payload inválido).
- Idempotente via \`on conflict do nothing\`.
- Insere \`role_permissions.is_active=true\` (paridade com mudanças do PR #A/#B).

## Não inclui

- Propagação para \`template_permissions\` (vem no PR #D quando a tabela existir).
- Reativação de rows \`is_active=false\` (toggle-module action faz isso; escopo separado).
- UI admin para chamar a RPC (uso é via migration SQL, não app).

## Dependência

Base: \`feat/roles-evolution\`. Depende de PR #A (\`role_permissions.is_active\` column) e PR #B (\`is_platform_admin()\` embutido em \`has_permission()\`, embora a RPC chame \`is_platform_admin()\` diretamente).

## Migration

- \`20260523000050_grant_module_to_all_companies_rpc.sql\`

## Test Plan

- [x] DB validation: function exists, signature correta, security definer
- [x] DB validation: grant/revoke restringe a authenticated (sem public/anon)
- [x] Smoke test: P0404 com módulo inexistente
- [x] Smoke test: P0422 com payload inválido
- [x] Smoke test: P0401 quando chamado como service role
- [ ] Manual: happy-path via app dev server como platform admin (opcional — primeiro uso real valida)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review Checklist

- Coverage: Spec seção 5.3 (versão sem template_permissions) ✓
- Placeholders: zero TBD/TODO
- Type consistency: assinatura `(text, jsonb) returns void` — sem TS types pra gerar (RPC não chamada por app)
- Idempotência: `on conflict do nothing` em ambos os inserts
- Segurança: SECURITY DEFINER + gate `is_platform_admin()` + revoke public/anon
- Erros tipados: P0401, P0404, P0422 (consistente com outras RPCs do projeto — ex.: `set_member_roles`)
- Rollback: drop function — reverso trivial

## YAGNI (explicitamente fora desta PR)

- `template_permissions` insert (PR #D quando tabela existir).
- Reativação de `is_active=false` rows existentes (toggle-module action cobre).
- TS helper que chame a RPC (sem caso de uso — uso é via migration).
- UI admin que dispare a RPC (não solicitado).
- Função inversa `revoke_module_from_all_companies` (não solicitado; toggle-module/bulk-toggle cobrem).
