-- ============================================================
-- Helpers reutilizáveis para suíte pgTAP
-- Carregado antes dos testes (ordem alfabética garante isso)
-- ============================================================

create schema if not exists tests;

-- ------------------------------------------------------------
-- tests.create_company
-- Cria empresa + habilita módulos inventory e movements +
-- executa bootstrap_company_rbac para gerar roles padrão.
-- ------------------------------------------------------------
create or replace function tests.create_company(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into public.companies (id, name, slug)
  values (v_id, p_slug, p_slug);

  -- Habilita os módulos necessários para os testes
  insert into public.company_modules (company_id, module_code) values
    (v_id, 'inventory'),
    (v_id, 'movements');

  perform public.bootstrap_company_rbac(v_id);

  return v_id;
end $$;

-- ------------------------------------------------------------
-- tests.company_id
-- Retorna UUID da empresa pelo slug.
-- ------------------------------------------------------------
create or replace function tests.company_id(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from public.companies where slug = p_slug;
  if v_id is null then
    raise exception 'Empresa com slug "%" não encontrada', p_slug;
  end if;
  return v_id;
end $$;

-- ------------------------------------------------------------
-- tests.create_user_in
-- Cria um usuário em auth.users (possível como postgres/superuser
-- no ambiente local do Supabase) com membership ativo na empresa
-- e role especificada.
-- ------------------------------------------------------------
create or replace function tests.create_user_in(
  p_email     text,
  p_slug      text,
  p_role_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id       uuid := gen_random_uuid();
  v_company_id    uuid;
  v_role_id       uuid;
  v_membership_id uuid;
begin
  -- Insere em auth.users — o role postgres tem acesso no ambiente local
  -- 'x' é intencionalmente inválido como bcrypt — estes usuários nunca fazem login real
  insert into auth.users (
    id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    aud, role
  )
  values (
    v_user_id, p_email, 'x',
    now(), now(), now(),
    'authenticated', 'authenticated'
  );

  v_company_id := tests.company_id(p_slug);

  insert into public.memberships (user_id, company_id, status)
  values (v_user_id, v_company_id, 'active')
  returning id into v_membership_id;

  select id into v_role_id
  from public.roles
  where company_id = v_company_id
    and code = p_role_code;

  if v_role_id is null then
    raise exception 'Role "%" não encontrada na empresa "%"', p_role_code, p_slug;
  end if;

  insert into public.membership_roles (membership_id, role_id)
  values (v_membership_id, v_role_id);

  return v_user_id;
end $$;

-- ------------------------------------------------------------
-- tests.authenticate_as
-- Simula um usuário autenticado via JWT claims.
-- Usa set_config com is_local=false para escopo de transação
-- (não de bloco), garantindo que queries fora do DO block
-- também enxerguem a mudança de role e as claims.
-- ------------------------------------------------------------
create or replace function tests.authenticate_as(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'authenticated', false);
  perform set_config(
    'request.jwt.claims',
    format('{"sub": "%s", "role": "authenticated"}', p_user_id),
    false
  );
end $$;

-- ------------------------------------------------------------
-- tests.reset_role
-- Volta para o role postgres (superuser) após simular usuário.
-- ------------------------------------------------------------
create or replace function tests.reset_role()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', false);
  perform set_config('request.jwt.claims', '{}', false);
end $$;
