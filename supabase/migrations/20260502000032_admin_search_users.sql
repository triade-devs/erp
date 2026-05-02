-- RPC para platform admins pesquisarem usuários não-membros de uma empresa.
-- SECURITY DEFINER para acessar auth.users (somente leitura).
create or replace function public.search_users_for_company(
  p_query       text,
  p_company_id  uuid
)
returns table(
  user_id   uuid,
  full_name text,
  email     text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Acesso negado';
  end if;

  return query
  select
    u.id::uuid,
    coalesce(p.full_name, split_part(u.email, '@', 1))::text,
    u.email::text
  from auth.users u
  left join public.profiles p on p.id = u.id
  where (
    p.full_name ilike '%' || p_query || '%'
    or u.email ilike '%' || p_query || '%'
  )
  and not exists (
    select 1 from public.memberships m
    where m.user_id = u.id
      and m.company_id = p_company_id
  )
  order by coalesce(p.full_name, u.email)
  limit 20;
end $$;
