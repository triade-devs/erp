-- ============================================================
-- 38 — SMTP-Free Auth: backfill memberships 'invited' → company_invitations
-- ============================================================

-- Tabela temporária para logar o backfill (platform admin consulta via UI)
create table if not exists public.migration_backfill_log (
  id           uuid primary key default gen_random_uuid(),
  membership_id uuid not null,
  invitation_id uuid not null,
  email         text not null,
  company_id    uuid not null,
  short_code    text not null,
  created_at    timestamptz not null default now()
);

-- Backfill: para cada membership com status='invited', cria company_invitation
-- Usa gen_random_uuid() para token_hash (placeholder) e um short_code único
-- O token real não pode ser recuperado — platform admin deve regenerar via UI
do $$
declare
  r record;
  v_email        text;
  v_inv_id       uuid;
  v_short_code   text;
  v_placeholder  bytea;
begin
  for r in
    select m.id as membership_id,
           m.company_id,
           m.invited_by,
           u.email
    from public.memberships m
    join auth.users u on u.id = m.user_id
    where m.status = 'invited'
  loop
    v_email       := lower(trim(r.email));
    v_inv_id      := gen_random_uuid();
    v_placeholder := decode(md5(r.membership_id::text), 'hex');
    -- Short code simples: 'BCK-' + primeiros 8 chars do UUID
    v_short_code  := 'BCK-' || upper(substring(replace(r.membership_id::text, '-', ''), 1, 4))
                     || '-' || upper(substring(replace(r.membership_id::text, '-', ''), 5, 4));

    insert into public.company_invitations (
      id, company_id, email, token_hash, short_code,
      role_ids, invited_by, status, expires_at
    )
    values (
      v_inv_id,
      r.company_id,
      v_email,
      v_placeholder,
      v_short_code,
      '{}',
      coalesce(r.invited_by, (select id from auth.users limit 1)),
      'pending',
      now() + interval '7 days'
    )
    on conflict do nothing;

    insert into public.migration_backfill_log
      (membership_id, invitation_id, email, company_id, short_code)
    values
      (r.membership_id, v_inv_id, v_email, r.company_id, v_short_code)
    on conflict do nothing;
  end loop;
end $$;
