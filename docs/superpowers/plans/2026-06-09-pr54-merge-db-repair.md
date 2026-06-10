# Repair do histórico de migrations — obrigatório no merge do PR #54

> **Status (verificado em 2026-06-09):** o banco de produção (`jrfyfgpjnswcguvvuxpx`) já contém
> **todas as mudanças das migrations 046–070 desta branch**, aplicadas por fora durante o
> desenvolvimento (SQL editor/MCP), **sem nenhum registro** em
> `supabase_migrations.schema_migrations`. Sem o repair abaixo, o `supabase db push` do merge
> tentará reaplicar as 25 migrations e falhará no primeiro statement não idempotente
> (`create table role_templates`, `create trigger`, etc.).

## O que foi verificado em 2026-06-09

- **19 functions** das migrations 046–070 comparadas via `md5(prosrc)` contra os arquivos
  finais desta branch: **todas funcionalmente idênticas**. Únicas diferenças: linhas de
  comentário `--` ausentes nas versões do banco de `bootstrap_company_rbac` (063) e
  `set_member_roles` (062) — sem impacto.
- Os commits de fix do dev (`0f029ff` bootstrap UPDATE, `27a38fe` escape 064, `6e118bd`
  policies 065) **já estão refletidos no banco**.
- `update_system_role_permissions` dropada (056 ✓). Seeds presentes: 94 `template_permissions`,
  hierarquia de templates (061 ✓), 12 roles com `parent_role_id`, policies RLS de
  `warehouses`/`role_scopes`/`field_catalog`/`role_field_rules` criadas.
- **Exceção — migration 054 (`kill_is_owner_policies`):** o rename
  `is_owner → legacy_is_owner` foi **revertido manualmente em 2026-06-09** porque quebrava o
  main em produção (`column memberships.is_owner does not exist` em
  `get-current-user`/`list-company-members`). A coluna hoje chama-se `is_owner` de novo.
  Os demais efeitos da 054 (backfill, `is_membership_owner`, policies novas) continuam aplicados,
  e a 054 é replayável por construção (`on conflict do nothing`, `create or replace`,
  `drop policy if exists`).

## Procedimento no merge

1. **Merge do PR #54** (código + arquivos de migration entram no main).

2. **Repair do histórico** — registrar as 24 migrations já aplicadas, **deixando a 054 de fora**
   (ela precisa rodar no push para refazer o rename junto com o código novo):

   ```sql
   insert into supabase_migrations.schema_migrations (version, name) values
     ('20260522000046', 'role_permissions_is_active'),
     ('20260523000047', 'has_permission_absorbs_platform_admin'),
     ('20260523000048', 'cleanup_redundant_platform_admin_or'),
     ('20260523000049', 'products_update_accepts_delete_perm'),
     ('20260523000050', 'grant_module_to_all_companies_rpc'),
     ('20260523000051', 'role_templates_schema'),
     ('20260523000052', 'seed_templates_from_system_roles'),
     ('20260523000053', 'bootstrap_and_apply_template_rpc'),
     ('20260524000055', 'fix_handle_new_user_drop_is_owner'),
     ('20260524000056', 'drop_obsolete_update_system_role_permissions'),
     ('20260525000057', 'platform_roles_schema'),
     ('20260525000058', 'platform_roles_seed_and_backfill'),
     ('20260525000059', 'rewrite_is_platform_admin'),
     ('20260525000060', 'roles_hierarchy_schema'),
     ('20260525000061', 'template_hierarchy_schema_and_seed'),
     ('20260525000062', 'can_manage_role_and_update_set_member_roles'),
     ('20260525000063', 'bootstrap_with_hierarchy'),
     ('20260525000064', 'scope_dimensions_and_role_scopes'),
     ('20260525000065', 'warehouses_table'),
     ('20260525000066', 'products_warehouse_scoping'),
     ('20260526000067', 'set_role_scopes_rpc'),
     ('20260528000068', 'field_catalog_and_role_field_rules'),
     ('20260528000069', 'field_mode_helpers'),
     ('20260528000070', 'products_enforce_field_rules')
   on conflict (version) do nothing;
   ```

3. **`supabase db push`** a partir do main pós-merge — deve aplicar **apenas a 054**
   (refaz `is_owner → legacy_is_owner`; o código mergeado já não referencia `is_owner`).

4. **`npm run db:types`** — regenerar `src/types/database.types.ts` (o main ganhou
   suppliers/spaces depois que esta branch divergiu; o types da branch está defasado).

5. **Verificação pós-merge:**
   - `select legacy_is_owner from memberships limit 1;` → funciona (rename refeito).
   - Login + `/[slug]/settings/members` e criação de produto funcionam em produção.
   - `supabase migration list` sem divergências entre local e remoto.

## Avisos

- **Não rodar `supabase db push` a partir do main ANTES do merge do PR #54** depois de feito o
  repair: o histórico remoto terá versões que não existem nos arquivos locais do main, e o CLI
  aborta pedindo repair.
- As migrations de spaces (PR #56, `20260609000046–48`) já foram aplicadas **com** registro de
  histórico alinhado aos arquivos em 2026-06-09 — não precisam de repair.
- Regra daqui pra frente: migration só entra no banco via merge + `db push`; se aplicada via
  MCP, registrar no histórico com a versão do arquivo (não a auto-gerada).
