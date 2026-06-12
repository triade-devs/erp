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
