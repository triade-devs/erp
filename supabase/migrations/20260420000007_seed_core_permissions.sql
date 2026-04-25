-- ============================================================
-- SEED: Módulos e Permissões do sistema
-- ============================================================

-- Módulos declarativos
insert into public.modules (code, name, is_system, sort_order) values
  ('core',       'Núcleo',        true,  0),
  ('inventory',  'Estoque',       false, 10),
  ('movements',  'Movimentações', false, 20);

-- Permissões atômicas por módulo
insert into public.permissions (code, module_code, resource, action, description) values
  -- core (gestão da empresa)
  ('core:member:invite',   'core', 'member',  'invite',  'Convidar membro'),
  ('core:member:manage',   'core', 'member',  'manage',  'Gerenciar membros'),
  ('core:role:manage',     'core', 'role',    'manage',  'Gerenciar roles e permissões'),
  ('core:audit:read',      'core', 'audit',   'read',    'Ler logs de auditoria'),
  ('core:company:update',  'core', 'company', 'update',  'Atualizar dados da empresa'),

  -- inventory
  ('inventory:product:read',   'inventory', 'product', 'read',   'Listar produtos'),
  ('inventory:product:create', 'inventory', 'product', 'create', 'Criar produto'),
  ('inventory:product:update', 'inventory', 'product', 'update', 'Editar produto'),
  ('inventory:product:delete', 'inventory', 'product', 'delete', 'Excluir produto'),
  ('inventory:product:export', 'inventory', 'product', 'export', 'Exportar catálogo'),

  -- movements
  ('movements:movement:read',   'movements', 'movement', 'read',   'Listar movimentações'),
  ('movements:movement:create', 'movements', 'movement', 'create', 'Registrar movimentação'),
  ('movements:movement:cancel', 'movements', 'movement', 'cancel', 'Cancelar movimentação');
