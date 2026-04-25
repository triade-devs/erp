-- ============================================================
-- PR #39 — Suíte pgTAP: isolamento cross-tenant via RLS
--
-- Casos cobertos:
--   1. Usuário da empresa A não vê produtos da empresa B (SELECT isolation)
--   2. Usuário da empresa A não vê movimentações da empresa B (SELECT isolation)
--   3. Operador da empresa A não consegue DELETE em produtos (sem permissão)
--   4. Gerente da empresa A consegue DELETE em produtos (tem permissão)
--   5. Operador da empresa A não consegue UPDATE em produtos (sem permissão)
-- ============================================================

begin;

select plan(5);

-- ============================================================
-- SETUP — executado como postgres (superuser)
-- ============================================================

-- Empresas isoladas
select tests.create_company('empresa-alfa');
select tests.create_company('empresa-beta');

-- Usuário da empresa A (operator) — verá apenas dados de alfa
do $$
declare
  v_user_a  uuid;
  v_user_b  uuid;
  v_mgr_a   uuid;
begin
  -- Armazena UUIDs em tabela temporária para uso nos testes
  create temp table test_users (role text primary key, user_id uuid);

  v_user_a := tests.create_user_in('op-alfa@test.local',  'empresa-alfa', 'operator');
  v_user_b := tests.create_user_in('op-beta@test.local',  'empresa-beta', 'operator');
  v_mgr_a  := tests.create_user_in('mgr-alfa@test.local', 'empresa-alfa', 'manager');

  insert into test_users values ('op_alfa', v_user_a);
  insert into test_users values ('op_beta', v_user_b);
  insert into test_users values ('mgr_alfa', v_mgr_a);
end $$;

-- Produto na empresa A
insert into public.products (id, company_id, sku, name, unit, cost_price, sale_price)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  tests.company_id('empresa-alfa'),
  'PROD-ALFA-001',
  'Produto Alfa',
  'UN', 10.00, 20.00
);

-- Produto na empresa B
insert into public.products (id, company_id, sku, name, unit, cost_price, sale_price)
values (
  'bbbbbbbb-0000-0000-0000-000000000001',
  tests.company_id('empresa-beta'),
  'PROD-BETA-001',
  'Produto Beta',
  'UN', 5.00, 15.00
);

-- Movimentação na empresa A (inserida como postgres — sem RLS)
insert into public.stock_movements (
  id, company_id, product_id, movement_type, quantity, performed_by
)
values (
  'aaaaaaaa-0000-0000-0000-000000000002',
  tests.company_id('empresa-alfa'),
  'aaaaaaaa-0000-0000-0000-000000000001',
  'in',
  10,
  (select user_id from test_users where role = 'op_alfa')
);

-- Movimentação na empresa B (inserida como postgres — sem RLS)
insert into public.stock_movements (
  id, company_id, product_id, movement_type, quantity, performed_by
)
values (
  'bbbbbbbb-0000-0000-0000-000000000002',
  tests.company_id('empresa-beta'),
  'bbbbbbbb-0000-0000-0000-000000000001',
  'in',
  5,
  (select user_id from test_users where role = 'op_beta')
);

-- ============================================================
-- TESTE 1: isolamento SELECT em products — usuário da empresa A
--          não deve ver produtos da empresa B
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
-- TESTE 2: isolamento SELECT em stock_movements — usuário da
--          empresa A não deve ver movimentações da empresa B
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
-- TESTE 3: operador da empresa A NÃO pode DELETE produtos
--          (operator não possui inventory:product:delete)
-- ============================================================
do $$ begin perform tests.authenticate_as((select user_id from test_users where role = 'op_alfa')); end $$;

select throws_ok(
  $q$
    delete from public.products
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'
  $q$,
  null,  -- qualquer SQLSTATE
  null,  -- sem checagem de mensagem específica (RLS viola sem raising explícito)
  'Teste 3: operador não pode deletar produtos (RLS bloqueia)'
);

do $$ begin perform tests.reset_role(); end $$;

-- ============================================================
-- TESTE 4: gerente da empresa A PODE DELETE produtos
--          (manager possui inventory:product:delete)
-- ============================================================
do $$ begin perform tests.authenticate_as((select user_id from test_users where role = 'mgr_alfa')); end $$;

select lives_ok(
  $q$
    delete from public.products
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'
  $q$,
  'Teste 4: gerente pode deletar produtos (tem inventory:product:delete)'
);

do $$ begin perform tests.reset_role(); end $$;

-- Restaura produto para o teste 5
insert into public.products (id, company_id, sku, name, unit, cost_price, sale_price)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  tests.company_id('empresa-alfa'),
  'PROD-ALFA-001',
  'Produto Alfa',
  'UN', 10.00, 20.00
);

-- ============================================================
-- TESTE 5: operador da empresa A NÃO pode UPDATE produtos
--          (operator não possui inventory:product:update)
-- ============================================================
do $$ begin perform tests.authenticate_as((select user_id from test_users where role = 'op_alfa')); end $$;

select throws_ok(
  $q$
    update public.products
    set name = 'Tentativa ilegal'
    where id = 'aaaaaaaa-0000-0000-0000-000000000001'
  $q$,
  null,  -- qualquer SQLSTATE
  null,
  'Teste 5: operador não pode atualizar produtos (RLS bloqueia)'
);

do $$ begin perform tests.reset_role(); end $$;

-- ============================================================
-- FIM
-- ============================================================
select * from finish();

rollback;
