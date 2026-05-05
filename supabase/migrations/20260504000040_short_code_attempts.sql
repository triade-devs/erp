-- ============================================================
-- 40 — SMTP-Free Auth: rate-limit para tentativas de short code
-- ============================================================

create table public.short_code_attempts (
  id           uuid primary key default gen_random_uuid(),
  ip           inet,
  identifier   text not null,  -- 'inv:<email>' | 'rst:<email>'
  attempts     int  not null default 1,
  locked_until timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_short_code_attempts_ident
  on public.short_code_attempts(identifier);

alter table public.short_code_attempts enable row level security;

-- Nenhum acesso público: apenas service_role via RPC
create policy "short_code_attempts_deny_all"
  on public.short_code_attempts
  using (false);

-- RPC: registra tentativa e verifica rate limit
-- 5 tentativas em 15 min por IP+identifier → lock por 1h
create or replace function public.record_short_code_attempt(
  p_ip         text,
  p_identifier text
)
returns boolean  -- true = permitido, false = bloqueado
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.short_code_attempts;
begin
  select * into v_row
  from public.short_code_attempts
  where identifier = p_identifier
    and (ip = p_ip::inet or ip is null)
  for update;

  if not found then
    insert into public.short_code_attempts (ip, identifier, attempts)
    values (p_ip::inet, p_identifier, 1);
    return true;
  end if;

  -- Se bloqueado e lock ainda válido
  if v_row.locked_until is not null and v_row.locked_until > now() then
    return false;
  end if;

  -- Reset se janela de 15 min passou
  if v_row.updated_at < now() - interval '15 minutes' then
    update public.short_code_attempts
    set attempts     = 1,
        locked_until = null,
        updated_at   = now()
    where id = v_row.id;
    return true;
  end if;

  -- Incrementa tentativas
  update public.short_code_attempts
  set attempts   = v_row.attempts + 1,
      locked_until = case when v_row.attempts + 1 >= 5
                          then now() + interval '1 hour'
                          else null end,
      updated_at = now()
  where id = v_row.id;

  return (v_row.attempts + 1) < 5;
end $$;

revoke all on function public.record_short_code_attempt(text, text) from public, anon;
grant execute on function public.record_short_code_attempt(text, text) to authenticated, service_role;
