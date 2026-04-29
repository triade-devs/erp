-- RPC SECURITY DEFINER: retorna o UUID de um usuário existente em auth.users pelo email.
-- Necessário para o fluxo de convite quando o usuário já tem conta no Supabase
-- (auth.admin.inviteUserByEmail falha para usuários existentes).
-- Restrito ao service_role — nunca exposto ao cliente público.
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = lower(trim(p_email))
  limit 1;

  return v_user_id;
end $$;

revoke all on function public.get_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_user_id_by_email(text) to service_role;
