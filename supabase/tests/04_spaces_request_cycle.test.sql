-- ============================================================
-- Spec 2026-06-11 — ciclo de solicitação de aluguel de espaços
-- ============================================================

begin;

select plan(8);

-- SETUP (como postgres)
select tests.create_company('empresa-spaces');

-- habilita o módulo spaces e reroda o bootstrap para ganhar as roles/perms de spaces
insert into public.company_modules (company_id, module_code)
values (tests.company_id('empresa-spaces'), 'spaces');
select public.bootstrap_company_rbac(tests.company_id('empresa-spaces'));

do $$
begin
  create temp table su (k text primary key, user_id uuid);
  insert into su values
    ('sol',    tests.create_user_in('sol@test.local',    'empresa-spaces', 'espacos-solicitante')),
    ('gestor', tests.create_user_in('gestor@test.local', 'empresa-spaces', 'espacos-gestao')),
    ('leitor', tests.create_user_in('leitor@test.local', 'empresa-spaces', 'espacos-leitura'));
  grant select on su to authenticated;
end $$;

insert into public.spaces (id, company_id, name, booking_mode)
values ('eeeeeeee-0000-0000-0000-000000000001', tests.company_id('empresa-spaces'), 'Sala Teste', 'both');

-- TESTE 1: solicitante cria pendência para si
do $$ begin perform tests.authenticate_as((select user_id from su where k = 'sol')); end $$;

select lives_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status, request_batch_id)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-10 10:00+00', '2027-01-10 12:00+00', 'pending', gen_random_uuid())$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'sol')),
  'Teste 1: solicitante cria pendência para si mesmo'
);

-- TESTE 2: solicitante NÃO cria pendência para outro usuário
select throws_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status, request_batch_id)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-11 10:00+00', '2027-01-11 12:00+00', 'pending', gen_random_uuid())$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'leitor')),
  '42501', NULL,
  'Teste 2: solicitante não cria pendência em nome de outro'
);

-- TESTE 3: solicitante NÃO cria reserva direta confirmada
select throws_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-12 10:00+00', '2027-01-12 12:00+00', 'confirmed')$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'sol')),
  '42501', NULL,
  'Teste 3: solicitante não cria reserva direta confirmada'
);

-- TESTE 4: pendência TRAVA o slot — segunda solicitação no mesmo horário falha
select throws_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status, request_batch_id)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-10 11:00+00', '2027-01-10 13:00+00', 'pending', gen_random_uuid())$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'sol')),
  '23P01', NULL,
  'Teste 4: pendência trava o slot (exclusion constraint)'
);

-- TESTE 5: solicitante EDITA a própria pendência (novo horário, continua pending)
select lives_ok(
  $q$update public.space_rentals
     set starts_at = '2027-01-10 14:00+00', ends_at = '2027-01-10 16:00+00'
     where renter_user_id = (select user_id from su where k = 'sol')
       and status = 'pending'$q$,
  'Teste 5: solicitante edita data/horário da própria pendência'
);

-- TESTE 6: solicitante NÃO auto-aprova a própria pendência
-- (violação de WITH CHECK em UPDATE lança erro 42501 — diferente do USING)
select throws_ok(
  $q$update public.space_rentals set status = 'confirmed'
     where renter_user_id = (select user_id from su where k = 'sol')
       and status = 'pending'$q$,
  '42501', NULL,
  'Teste 6: solicitante não auto-aprova (with check rejeita)'
);

do $$ begin perform tests.reset_role(); end $$;

-- TESTE 7: gestor com approve confirma a pendência
do $$ begin perform tests.authenticate_as((select user_id from su where k = 'gestor')); end $$;

update public.space_rentals set status = 'confirmed'
where space_id = 'eeeeeeee-0000-0000-0000-000000000001' and status = 'pending';

select is(
  (select count(*)::int from public.space_rentals
   where space_id = 'eeeeeeee-0000-0000-0000-000000000001' and status = 'confirmed'),
  1,
  'Teste 7: gestor aprova a pendência (pending → confirmed)'
);

do $$ begin perform tests.reset_role(); end $$;

-- TESTE 8: espacos-leitura não consegue solicitar
do $$ begin perform tests.authenticate_as((select user_id from su where k = 'leitor')); end $$;

select throws_ok(
  format($q$insert into public.space_rentals
    (company_id, space_id, renter_user_id, booking_kind, starts_at, ends_at, status, request_batch_id)
    values ('%s', 'eeeeeeee-0000-0000-0000-000000000001', '%s', 'hourly',
            '2027-01-15 10:00+00', '2027-01-15 12:00+00', 'pending', gen_random_uuid())$q$,
    tests.company_id('empresa-spaces'),
    (select user_id from su where k = 'leitor')),
  '42501', NULL,
  'Teste 8: leitura não tem permissão de solicitar'
);

do $$ begin perform tests.reset_role(); end $$;

select * from finish();
rollback;
