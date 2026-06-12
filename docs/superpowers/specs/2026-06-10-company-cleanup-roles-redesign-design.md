# Spec: Limpeza de empresas + redesign de roles por módulo × nível

**Data:** 2026-06-10
**Status:** aprovado pelo usuário (conversa de design)
**Banco alvo:** projeto Supabase `erp` (`jrfyfgpjnswcguvvuxpx`), produção

## Objetivo

1. Apagar todas as empresas exceto **Default** (`default-company`) e **Complexo do Hospital de Clínicas da UFPR** (`hc-ufpr`), junto com todos os dados relacionados a elas.
2. Preservar **todos os usuários** (`auth.users` / `profiles`) — nenhum dado de usuário é alterado.
3. Apagar as roles atuais e recriá-las **por empresa**, organizadas por **módulo × nível de acesso** (ações que o usuário pode executar no sistema), com códigos semânticos.

## Estado atual (levantado em 2026-06-10)

| Empresa                                  | Slug              | Membros | Produtos | Destino |
| ---------------------------------------- | ----------------- | ------- | -------- | ------- |
| Default                                  | `default-company` | 4       | 55       | manter  |
| Complexo do Hospital de Clínicas da UFPR | `hc-ufpr`         | 2       | 0        | manter  |
| LD Vidrassaria e Serralheria             | `ldvs`            | 0       | 0        | apagar  |
| TriadeDevs                               | `triadedevs`      | 2       | 1        | apagar  |
| Empresa Teste                            | `empresa-teste`   | 3       | 1        | apagar  |
| "empresa testezão…" (teste)              | `etet…`           | 1       | 0        | apagar  |

- Todas as tabelas com `company_id` têm `ON DELETE CASCADE` (exceto `audit_logs`, que é `SET NULL`).
- Roles atuais: `owner`/`manager`/`operator` (sistema, via templates) + `docs` (Default) e `anestesia` (HC-UFPR).
- Módulos com permissões: `core`, `inventory`, `movements`, `suppliers`, `spaces`, `medical-records`, `knowledge-base`, `anestesia`.

## Dependências de código nos códigos de role (motivam mudanças de código)

- `src/modules/auth/queries/get-current-user.ts` — `isOwner = roleCodes.includes("owner")`.
- `src/modules/tenancy/queries/list-company-members.ts` — idem.
- `src/modules/tenancy/actions/create-company.ts` — atribui role `owner` ao criador.
- `src/modules/tenancy/actions/toggle-module.ts` e `bulk-toggle-module-for-companies.ts` — concedem permissões por código `owner`/`manager`/`operator` ao habilitar módulo (pulam ausentes, sem erro).
- Trigger Postgres `handle_new_user_default_membership` — todo signup novo recebe a role `operator` da empresa Default (pula se ausente → usuário sem acesso, silencioso).

## Decisões de design

### D1. Limpeza de dados

1. **Revincular órfãos antes de apagar:** usuários cuja única membership está nas 4 empresas a apagar recebem membership ativa na Default com a role `estoque-leitura`.
2. `DELETE FROM companies` nas 4 empresas — cascade limpa o restante. `audit_logs` delas ficam com `company_id = null` (preservados).
3. Usuários e profiles intocados.

### D2. Novas roles — códigos semânticos

Hierarquia: `admin` nível 0; demais roles filhas de `admin` (nível 1), para `can_manage_role()` permitir que admin gerencie todas.

**Default** (perfil estoque):

| Código             | Nome                           | Permissões                                                               |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------ |
| `admin`            | Admin                          | todas do catálogo                                                        |
| `estoque-gestao`   | Gestão de Estoque              | `inventory:*`, `movements:*`, `suppliers:*`                              |
| `estoque-operacao` | Operação de Estoque            | `movements:create`, `movements:read`, `inventory:read`, `suppliers:read` |
| `estoque-leitura`  | Leitura de Estoque             | `inventory:read`, `movements:read`, `suppliers:read`                     |
| `kb-editor`        | Editor da Base de Conhecimento | `knowledge-base:*`                                                       |

**HC-UFPR** (perfil hospital) — somente 4 roles:

| Código               | Nome                 | Permissões                                                                |
| -------------------- | -------------------- | ------------------------------------------------------------------------- |
| `admin`              | Admin                | todas do catálogo                                                         |
| `prontuario-medico`  | Prontuário — Médico  | `medical-records`: `read_assigned`, `create`, `update`, `write`, `accept` |
| `prontuario-leitura` | Prontuário — Leitura | `medical-records:read_assigned`                                           |
| `anestesia`          | Anestesia            | `anestesia:read`, `anestesia:write`                                       |

### D3. Migração dos usuários (mapeamento capturado ANTES do delete das roles)

Por empresa: `owner`→`admin`, `manager`→`estoque-gestao`, `operator`→`estoque-operacao`, `docs`→`kb-editor`, `anestesia`→`anestesia`. Atribuições a roles sem equivalente na empresa são descartadas (no HC-UFPR, `manager`/`operator` caem — na prática ambos os membros já são `owner`→`admin`, ninguém perde acesso). Órfãos revinculados → `estoque-leitura` na Default.

### D4. Mudanças de código (TS)

- `get-current-user.ts` e `list-company-members.ts`: `isOwner` checa código `admin`.
- `create-company.ts`: atribui `admin` ao criador.
- `toggle-module.ts` / `bulk-toggle-module-for-companies.ts`: mapeamento `admin`/`estoque-gestao`/`estoque-operacao` (pulando ausentes, como hoje).
- Testes correspondentes atualizados.

### D5. Migrations (Postgres)

- `handle_new_user_default_membership`: novos signups recebem `estoque-leitura` na Default.
- `role_templates` + `template_permissions` + hierarquia de templates reescritos para a taxonomia da Default (`admin`, `estoque-gestao`, `estoque-operacao`, `estoque-leitura`, `kb-editor`) — empresas futuras nascem no padrão novo via `bootstrap_company_rbac`.

### D6. Execução

1. Merge do código TS + migrations (mesma PR).
2. Migrations aplicadas via MCP `apply_migration` (registra no histórico remoto; contorna o drift do PR #54 aplicado por fora) com os mesmos arquivos commitados no repo.
3. Script de dados em **uma transação única**: captura mapeamento de roles → revincula órfãos → apaga as 4 empresas → apaga e recria roles das 2 empresas mantidas → reatribui usuários. Script salvo no repo para registro.
4. Backup lógico (dump das tabelas afetadas: `companies`, `roles`, `role_permissions`, `memberships`, `membership_roles`) antes de executar.

### D7. Verificação pós-execução

- 2 empresas restantes; todos os membros com ≥ 1 role; nenhum usuário com 0 memberships que tinha membership antes.
- RLS: usuário comum com permissão vê dados; sem permissão recebe 0 rows; platform admin vê tudo (lembrando: falha de RLS é silenciosa).
- Smoke test de signup novo → recebe `estoque-leitura` na Default.
- `npm run typecheck`, lint e testes existentes passando após mudanças TS.

## Fora de escopo

- Apagar `audit_logs` órfãos (preservados com `company_id = null`).
- Mudanças em `platform_roles` / `platform_role_assignments` (admins de plataforma intocados).
- Scopes (`role_scopes`) e field rules (`role_field_rules`) — não há regras configuradas para as roles novas; podem ser configuradas depois pela UI.
