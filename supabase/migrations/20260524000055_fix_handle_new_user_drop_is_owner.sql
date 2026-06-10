-- 20260524000055_fix_handle_new_user_drop_is_owner.sql
-- Fix do PR #D2: a migration 054 renomeou memberships.is_owner para
-- legacy_is_owner, mas a function handle_new_user_default_membership
-- (trigger on_auth_user_created em auth.users) ainda referenciava is_owner
-- no INSERT. Signup novo passaria a falhar.
--
-- Solução: reescrever function dropando is_owner do INSERT — default era false
-- e a role 'operator' é atribuída logo abaixo via membership_roles (que é
-- a nova fonte de verdade do PR #D2).

create or replace function public.handle_new_user_default_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_company_id uuid;
  v_membership_id      uuid;
  v_operator_role_id   uuid;
begin
  -- 1. Cria ou ignora o profile público do usuário
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- 2. Busca a empresa padrão (criada no Sprint 1)
  select id into v_default_company_id
  from public.companies
  where slug = 'default-company'
  limit 1;

  -- Se não existir empresa padrão, não cria membership (ambiente novo)
  if v_default_company_id is null then
    return new;
  end if;

  -- 3. Cria membership como active. Sem is_owner — owner agora é via
  -- membership_roles + roles.code='owner' (PR #D2).
  insert into public.memberships (user_id, company_id, status, joined_at)
  values (new.id, v_default_company_id, 'active', now())
  on conflict (user_id, company_id) do nothing
  returning id into v_membership_id;

  -- Se o INSERT foi ignorado (conflito), não atribui role novamente
  if v_membership_id is null then
    return new;
  end if;

  -- 4. Atribui role 'operator' da empresa padrão (se existir)
  select id into v_operator_role_id
  from public.roles
  where company_id = v_default_company_id
    and code = 'operator'
  limit 1;

  if v_operator_role_id is not null then
    insert into public.membership_roles (membership_id, role_id)
    values (v_membership_id, v_operator_role_id)
    on conflict do nothing;
  end if;

  return new;
end $$;
