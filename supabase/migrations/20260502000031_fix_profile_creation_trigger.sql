-- Corrige trigger que perdeu a criação de profiles (20260423000010 removeu handle_new_user
-- e substituiu por handle_new_user_default_membership sem preservar o INSERT em profiles).
-- Usuários criados depois disso têm membership mas nenhuma row em profiles → nome "—".

-- 1. Atualizar a função para criar profile + membership
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
  -- Cria ou ignora o perfil público do usuário
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  -- Busca a empresa padrão
  select id into v_default_company_id
  from public.companies
  where slug = 'default-company'
  limit 1;

  if v_default_company_id is null then
    return new;
  end if;

  insert into public.memberships (user_id, company_id, status, is_owner, joined_at)
  values (new.id, v_default_company_id, 'active', false, now())
  on conflict (user_id, company_id) do nothing
  returning id into v_membership_id;

  if v_membership_id is null then
    return new;
  end if;

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

-- 2. Backfill: criar profiles para usuários existentes sem row em profiles
insert into public.profiles (id, full_name)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
