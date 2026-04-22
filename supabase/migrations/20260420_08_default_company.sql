-- ============================================================
-- EMPRESA SEMENTE: default-company
-- Cria a empresa padrão para dados existentes (migração single→multi-tenant)
-- ============================================================

do $$
declare
  v_company_id uuid;
begin
  -- Cria a empresa padrão se ainda não existir
  insert into public.companies (name, slug, plan, is_active)
  values ('Default', 'default-company', 'starter', true)
  on conflict (slug) do nothing
  returning id into v_company_id;

  -- Se já existia, busca o id
  if v_company_id is null then
    select id into v_company_id from public.companies where slug = 'default-company';
  end if;

  -- Habilita todos os módulos existentes para a default-company
  insert into public.company_modules (company_id, module_code)
  select v_company_id, code from public.modules
  on conflict do nothing;

  -- Cria roles owner/manager/operator via bootstrap
  perform public.bootstrap_company_rbac(v_company_id);

  -- Cria memberships para todos os usuários existentes
  -- O usuário mais antigo vira owner; os demais entram como operator
  insert into public.memberships (user_id, company_id, status, is_owner)
  select
    u.id,
    v_company_id,
    'active',
    -- Primeiro usuário criado vira owner da default-company
    u.created_at = (select min(created_at) from auth.users)
  from auth.users u
  where not exists (
    select 1 from public.memberships m
    where m.user_id = u.id and m.company_id = v_company_id
  );

  -- Atribui role 'owner' ao owner e 'operator' aos demais
  insert into public.membership_roles (membership_id, role_id)
  select
    m.id,
    r.id
  from public.memberships m
  join public.roles r on r.company_id = v_company_id
    and r.code = case when m.is_owner then 'owner' else 'operator' end
  where m.company_id = v_company_id
    and not exists (
      select 1 from public.membership_roles mr where mr.membership_id = m.id
    );
end $$;
