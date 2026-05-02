# Spec: Gestão Global de Módulos e Roles (Platform Admin)

**Data:** 2026-05-02  
**Status:** Aprovado

## Contexto

O admin da plataforma hoje precisa navegar empresa por empresa para ver módulos habilitados e roles existentes. Esta feature adiciona uma área `/admin/platform` com gestão centralizada de módulos (catálogo global) e roles (sistema + por empresa).

## Rotas

```
/admin/platform/modules          → catálogo de módulos com stats
/admin/platform/modules/new      → criar módulo
/admin/platform/modules/[code]   → editar módulo + CRUD de permissões
/admin/platform/roles            → roles (tabs: Sistema / Por Empresa)
```

`/admin/platform/layout.tsx` é filho de `/admin/layout.tsx` — herda proteção `is_platform_admin()` sem duplicar código.

## Navegação

`ADMIN_MENU` em `src/core/navigation/menu.ts` ganha dois itens:

```ts
{ label: "Módulos",  href: "/admin/platform/modules", icon: "puzzle" },
{ label: "Roles",    href: "/admin/platform/roles",   icon: "shield" },
```

## Módulos (`/admin/platform/modules`)

### Lista

Tabela com colunas: **Nome · Código · Permissões · Empresas ativas · Ativo · Ações**

- Toggle `is_active`: desativa o módulo no catálogo (novas empresas não podem ativar; empresas existentes mantêm acesso até desativarem individualmente).
- Botão **"Ativar para todas as empresas"**: bulk INSERT em `company_modules` para todas as empresas.
- Botão **"Desativar para todas as empresas"**: bulk DELETE em `company_modules` para todas as empresas.
- Botão **Editar**: navega para `/admin/platform/modules/[code]`.

### Criar (`/admin/platform/modules/new`)

Form: `code` (slug único), `name`, `description`, `icon`, `sort_order`, `is_system`.

### Editar (`/admin/platform/modules/[code]`)

- Campos editáveis: `name`, `description`, `icon`, `sort_order`.
- `code` e `is_system` são somente-leitura após criação.
- Seção **Permissões do módulo**: tabela com `code`, `resource`, `action`, `description` + botão adicionar + botão remover.

> ⚠️ Remover permissão dispara `ON DELETE CASCADE` em `role_permissions` — UI exibe confirmação listando quantas roles perdem a permissão antes de confirmar.

## Roles (`/admin/platform/roles`)

### Tab "Roles Sistema"

Roles com `is_system = true` deduplicados por `code`. Exibe matriz de permissões agrupada por módulo — mesma estrutura visual que o editor de roles por empresa já existente.

A query `getSystemRolePermissions(code)` retorna a **união** das permissões de todos os roles com aquele code. Se houver inconsistência entre empresas (role `operator` da empresa A tem `kb:article:read` mas empresa B não tem), a permissão aparece marcada com badge "inconsistente". Ao salvar, a RPC normaliza todas as empresas para o conjunto escolhido pelo admin — inconsistências são resolvidas na primeira edição.

Ao salvar, a action chama a RPC `update_system_role_permissions(role_code, permission_codes[])` que atomicamente executa:

```sql
DELETE FROM role_permissions
WHERE role_id IN (SELECT id FROM roles WHERE code = role_code AND is_system = true);

INSERT INTO role_permissions (role_id, permission_code)
SELECT r.id, unnest(permission_codes)
FROM roles r
WHERE r.code = role_code AND r.is_system = true
ON CONFLICT DO NOTHING;
```

Propagação é imediata para todas as empresas existentes.

### Tab "Por Empresa"

Tabela global: **Empresa · Role · Código · Sistema? · Qtd. Permissões**

- Filtros: empresa, `is_system`.
- Click em role abre editor de permissões daquele role específico (reutiliza `update-role-permissions` action existente).

## Camada de dados

### Novas queries (`modules/tenancy/queries/`)

| Função                           | Descrição                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `listModulesWithStats()`         | todos módulos (sem filtro `is_active`) + count permissões + count `company_modules` |
| `getModuleWithPermissions(code)` | módulo + array de permissões                                                        |
| `listAllRoles()`                 | todos roles de todas as empresas com `company_name`                                 |
| `getSystemRolePermissions(code)` | permissões de um role-sistema (por code)                                            |

### Novas actions (`modules/tenancy/actions/`)

| Action                         | Operação                                   |
| ------------------------------ | ------------------------------------------ |
| `createModule`                 | INSERT em `modules`                        |
| `updateModule`                 | UPDATE em `modules`                        |
| `toggleModuleActive`           | UPDATE `is_active` em `modules`            |
| `bulkToggleModuleForCompanies` | INSERT ou DELETE bulk em `company_modules` |
| `createPermission`             | INSERT em `permissions`                    |
| `deletePermission`             | DELETE em `permissions`                    |
| `updateSystemRolePermissions`  | chama RPC Postgres com propagação global   |

### Nova migração

`supabase/migrations/20260502_NNNN_platform_admin_rpcs.sql`

```sql
create or replace function update_system_role_permissions(
  role_code text,
  permission_codes text[]
) returns void
language plpgsql
security definer
as $$
begin
  delete from role_permissions
  where role_id in (
    select id from roles where code = role_code and is_system = true
  );

  insert into role_permissions (role_id, permission_code)
  select r.id, unnest(permission_codes)
  from roles r
  where r.code = role_code and r.is_system = true
  on conflict do nothing;
end;
$$;
```

Proteção: apenas `platform_admins` podem chamar esta RPC — adicionar `REVOKE EXECUTE ... FROM PUBLIC` + `GRANT EXECUTE ... TO service_role`.

## Segurança

- Todas as actions chamam `requirePermission()` ou verificam `is_platform_admin()` via RPC antes de qualquer escrita.
- RLS nas tabelas `modules`, `permissions`, `roles`, `role_permissions` já existe — as policies existentes cobrem leitura autenticada; escritas via `security definer` RPC ou service role.
- Deleção de permissão exige confirmação explícita na UI dado o cascade destrutivo.

## Fora de escopo

- Deleção de módulos (apenas `is_active = false` — segurança de dados).
- Deleção de roles-sistema (integridade de empresas existentes).
- Auditoria das mudanças (existe `audit` separado).
