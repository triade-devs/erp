-- ============================================================
-- PR #39 — Suíte pgTAP: isolamento cross-tenant via RLS
--
-- Casos cobertos:
--   1. Usuário da empresa A não vê produtos da empresa B (SELECT isolation)
--   2. Usuário da empresa A não vê movimentações da empresa B (SELECT isolation)
--   3. Operador da empresa A não consegue DELETE em produtos (sem permissão)
--   4. Gerente da empresa A consegue DELETE em produtos (tem permissão)
--   5. Operador da empresa A não consegue UPDATE em produtos (sem permissão)
--
-- Nota: RLS DELETE/UPDATE via USING bloqueia silenciosamente (0 linhas
-- afetadas, sem exceção). Os testes verificam que o dado persiste intacto.
-- ============================================================

begin;

-- 6 = testes 1..6 (select×2, delete-bloqueado, delete-permitido, update-bloqueado, insert-bloqueado)
select plan(6);

-- ============================================================
-- SETUP — executado como postgres (superuser, ignora RLS)
-- ============================================================

select tests.create_company('empresa-alfa');
select tests.create_company('empresa-beta');

do $$
declare
  v_op_alfa  uuid;
  v_op_beta  uuid;
  v_mgr_alfa uuid;
begin
  create temp table test_users (role text primary key, user_id uuid);

  v_op_alfa  := tests.create_user_in('op-alfa@test.local',  'empresa-alfa', 'operator');
  v_op_beta  := tests.create_user_in('op-beta@test.local',  'empresa-beta', 'operator');
  v_mgr_alfa := tests.create_user_in('mgr-alfa@test.local', 'empresa-alfa', 'manager');

  insert into test_users values
    ('op_alfa',  v_op_alfa),
    ('op_beta',  v_op_beta),
    ('mgr_alfa', v_mgr_alfa);
end $$;

-- Produto na empresa A com movimentação (usado nos testes 1, 2, 3, 5)
insert into public.products (id, company_id, sku, name, unit, cost_price, sale_price)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  tests.company_id('empresa-alfa'),
  'PROD-ALFA-001', 'Produto Alfa', 'UN', 10.00, 20.00
);

-- Produto na empresa A SEM movimentação (usado no teste 4 — será deletado)
insert into public.products (id, company_id, sku, name, unit, cost_price, sale_price)
values (
  'aaaaaaaa-0000-0000-0000-000000000099',
  tests.company_id('empresa-alfa'),
  'PROD-ALFA-DEL', 'Produto para Deletar', 'UN', 1.00, 2.00
);

-- Produto na empresa B com movimentação (usado nos testes 1 e 2)
insert into public.products (id, company_id, sku, name, unit, cost_price, sale_price)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  tests.company_id('empresa-beta'),
  'PROD-BETA-001', 'Produto Beta', 'UN', 5.00, 15.00
);

-- Movimentação na empresa A
insert into public.stock_movements (
  id, company_id, product_id, movement_type, quantity, performed_by
)
values (
  'aaaaaaaa-0000-0000-0000-000000000002',
  tests.company_id('empresa-alfa'),
  'aaaaaaaa-0000-0000-0000-000000000001',
  'in', 10,
  (select user_id from test_users where role = 'op_alfa')
);

-- Movimentação na empresa B
insert into public.stock_movements (
  id, company_id, product_id, movement_type, quantity, performed_by
)
values (
  'bbbbbbbb-0000-0000-0000-000000000002',
  tests.company_id('empresa-beta'),
  'bbbbbbbb-0000-0000-0000-000000000001',
  'in', 5,
  (select user_id from test_users where role = 'op_beta')
);

-- ============================================================
-- TESTE 1: isolamento SELECT em products
--          op_alfa não deve ver produtos de empresa-beta
-- ============================================================
do $$ begin perform tests.authenticate_as((select user_id from test_users where role = 'op_alfa')); end $$;

select is(
  (select count(*)::int from public.products
   where company_id = tests.company_id('empresa-beta')),
  0,
  'Teste 1: operador de alfa não enxerga produtos de beta via RLS'
);

do $$ begin perform tests.reset_role(); end $$;

-- ============================================================
-- TESTE 2: isolamento SELECT em stock_movements
--          op_alfa não deve ver movimentações de empresa-beta
-- ============================================================
do $$ begin perform tests.authenticate_as((select user_id from test_users where role = 'op_alfa')); end $$;

select is(
  (select count(*)::int from public.stock_movements
   where company_id = tests.company_id('empresa-beta')),
  0,
  'Teste 2: operador de alfa não enxerga movimentações de beta via RLS'
);

do $$ begin perform tests.reset_role(); end $$;

-- ============================================================
-- TESTE 3: operador de empresa A NÃO pode DELETE produtos
--          (operator não possui inventory:product:delete)
--          RLS USING bloqueia silenciosamente — produto persiste
-- ============================================================
do $$ begin perform tests.authenticate_as((select user_id from test_users where role = 'op_alfa')); end $$;

delete from public.products where id = 'aaaaaaaa-0000-0000-0000-000000000099';

select is(
  (select count(*)::int from public.products where id = 'aaaaaaaa-0000-0000-0000-000000000099'),
  1,
  'Teste 3: operador não pode deletar produtos (RLS bloqueia silenciosamente — produto persiste)'
);

do $$ begin perform tests.reset_role(); end $$;

-- ============================================================
-- TESTE 4: gerente de empresa A PODE DELETE produtos
--          (manager possui inventory:product:delete)
--          Produto sem FK em stock_movements para evitar restrict
-- ============================================================
do $$ begin perform tests.authenticate_as((select user_id from test_users where role = 'mgr_alfa')); end $$;

delete from public.products where id = 'aaaaaaaa-0000-0000-0000-000000000099';

select is(
  (select count(*)::int from public.products where id = 'aaaaaaaa-0000-0000-0000-000000000099'),
  0,
  'Teste 4: gerente pode deletar produtos (tem inventory:product:delete — produto removido)'
);

do $$ begin perform tests.reset_role(); end $$;

-- ============================================================
-- TESTE 5: operador de empresa A NÃO pode UPDATE produtos
--          (operator não possui inventory:product:update)
--          RLS USING bloqueia silenciosamente — nome inalterado
-- ============================================================
do $$ begin perform tests.authenticate_as((select user_id from test_users where role = 'op_alfa')); end $$;

update public.products
set name = 'Tentativa ilegal'
where id = 'aaaaaaaa-0000-0000-0000-000000000001';

select is(
  (select name from public.products where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'Produto Alfa',
  'Teste 5: operador não pode atualizar produtos (RLS bloqueia silenciosamente — nome inalterado)'
);

do $$ begin perform tests.reset_role(); end $$;

-- ============================================================
-- TESTE 6: operador de empresa A NÃO pode INSERT movimentação
--          em produto de empresa B.
--          Policy WITH CHECK levanta exceção (diferente de USING
--          que bloqueia silenciosamente).
-- ============================================================
do $$ begin perform tests.authenticate_as((select user_id from test_users where role = 'op_alfa')); end $$;

select throws_ok(
  format(
    $q$insert into public.stock_movements (company_id, product_id, movement_type, quantity, performed_by)
       values ('%s', 'bbbbbbbb-0000-0000-0000-000000000001', 'in', 1, '%s')$q$,
    tests.company_id('empresa-beta'),
    (select user_id from test_users where role = 'op_alfa')
  ),
  'Teste 6: operador de alfa não pode inserir movimentação em produto de beta (RLS WITH CHECK rejeita)'
);

do $$ begin perform tests.reset_role(); end $$;

-- ============================================================
select * from finish();
rollback;
