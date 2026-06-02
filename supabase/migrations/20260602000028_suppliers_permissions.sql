-- Módulo declarativo
insert into public.modules (code, name, is_system, sort_order) values
  ('suppliers', 'Fornecedores', false, 20)
on conflict (code) do nothing;

-- Permissões atômicas
insert into public.permissions (code, module_code, resource, action, description) values
  ('suppliers:supplier:read',   'suppliers', 'supplier', 'read',   'Ver fornecedores'),
  ('suppliers:supplier:create', 'suppliers', 'supplier', 'create', 'Criar fornecedores'),
  ('suppliers:supplier:update', 'suppliers', 'supplier', 'update', 'Editar fornecedores'),
  ('suppliers:supplier:delete', 'suppliers', 'supplier', 'delete', 'Desativar fornecedores')
on conflict (code) do nothing;

-- Habilita módulo para todas as empresas existentes
insert into public.company_modules (company_id, module_code)
select id, 'suppliers' from public.companies
on conflict do nothing;

-- owner: todas
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r
cross join public.permissions p
where r.code = 'owner' and p.module_code = 'suppliers'
on conflict do nothing;

-- manager: read/create/update
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r
cross join public.permissions p
where r.code = 'manager'
  and p.code in ('suppliers:supplier:read','suppliers:supplier:create','suppliers:supplier:update')
on conflict do nothing;

-- operator: read
insert into public.role_permissions (role_id, permission_code)
select r.id, p.code from public.roles r
cross join public.permissions p
where r.code = 'operator' and p.code = 'suppliers:supplier:read'
on conflict do nothing;

-- Fornecedor default por empresa (necessário para backfill de products.supplier_id)
insert into public.suppliers (company_id, name, is_active)
select id, 'FORNECEDOR NÃO INFORMADO', true from public.companies
on conflict do nothing;
