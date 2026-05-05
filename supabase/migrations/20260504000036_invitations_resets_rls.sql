-- ============================================================
-- 36 — SMTP-Free Auth: RLS policies + RPCs security definer
-- ============================================================

-- ── company_invitations policies ──────────────────────────

create policy "invitations_select"
  on public.company_invitations for select
  using (
    is_platform_admin()
    or has_permission(company_id, 'core:invitation:read')
  );

create policy "invitations_insert"
  on public.company_invitations for insert
  with check (
    is_platform_admin()
    or has_permission(company_id, 'core:invitation:create')
  );

create policy "invitations_update"
  on public.company_invitations for update
  using (
    is_platform_admin()
    or has_permission(company_id, 'core:invitation:create')
  )
  with check (
    is_platform_admin()
    or has_permission(company_id, 'core:invitation:create')
  );

-- DELETE bloqueado: sem policy de delete

-- ── password_reset_requests policies ──────────────────────

-- Helper: verifica se auth.uid() tem membership ativa com determinada permissão
-- na empresa a que pertence o user-alvo
create or replace function public.actor_can_manage_reset(p_user_id uuid, p_permission text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships actor_m
    join public.memberships target_m
      on target_m.user_id = p_user_id
     and target_m.company_id = actor_m.company_id
     and target_m.status = 'active'
    where actor_m.user_id = auth.uid()
      and actor_m.status = 'active'
      and has_permission(actor_m.company_id, p_permission)
      -- company owner não pode resetar outro owner
      and not (target_m.is_owner = true and not is_platform_admin())
  )
$$;

create policy "reset_requests_select"
  on public.password_reset_requests for select
  using (
    is_platform_admin()
    or auth.uid() = user_id
    or actor_can_manage_reset(user_id, 'core:reset_request:read')
  );

create policy "reset_requests_update"
  on public.password_reset_requests for update
  using (
    is_platform_admin()
    or actor_can_manage_reset(user_id, 'core:reset_request:approve')
  )
  with check (
    is_platform_admin()
    or actor_can_manage_reset(user_id, 'core:reset_request:approve')
  );

-- INSERT via RPC apenas (sem policy de insert direto)

-- ── RPC: accept_invitation ─────────────────────────────────
-- Transacional: marca convite como aceito + cria membership + membership_roles
create or replace function public.accept_invitation(
  p_token_hash bytea,
  p_short_code text,
  p_user_id    uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation  public.company_invitations;
  v_membership  uuid;
  v_slug        text;
  v_valid_roles uuid[];
begin
  -- Lookup por token hash ou short code
  if p_token_hash is not null then
    select * into v_invitation
    from public.company_invitations
    where token_hash = p_token_hash
      and status = 'pending'
      and expires_at > now()
    for update;
  else
    select * into v_invitation
    from public.company_invitations
    where short_code = upper(p_short_code)
      and status = 'pending'
      and expires_at > now()
    for update;
  end if;

  if v_invitation.id is null then
    raise exception 'invitation_not_found';
  end if;

  -- Marca convite como aceito
  update public.company_invitations
  set status      = 'accepted',
      accepted_at = now(),
      accepted_by = p_user_id
  where id = v_invitation.id;

  -- Cria membership ativa
  insert into public.memberships (user_id, company_id, status, joined_at)
  values (p_user_id, v_invitation.company_id, 'active', now())
  on conflict (user_id, company_id) do update
    set status    = 'active',
        joined_at = now()
  returning id into v_membership;

  -- Filtra role_ids ainda válidas e insere membership_roles
  select array_agg(r.id) into v_valid_roles
  from unnest(v_invitation.role_ids) rid(id)
  join public.roles r on r.id = rid.id
  where r.company_id = v_invitation.company_id;

  if v_valid_roles is not null then
    insert into public.membership_roles (membership_id, role_id, assigned_by)
    select v_membership, unnest(v_valid_roles), v_invitation.invited_by
    on conflict do nothing;
  end if;

  -- Retorna slug para redirect
  select slug into v_slug from public.companies where id = v_invitation.company_id;

  return jsonb_build_object('company_slug', v_slug, 'company_id', v_invitation.company_id);
end $$;

revoke all on function public.accept_invitation(bytea, text, uuid) from public, anon;
grant execute on function public.accept_invitation(bytea, text, uuid) to authenticated, service_role;

-- ── RPC: request_password_reset ────────────────────────────
-- Anti-enumeration: sempre retorna sem revelar se email existe
create or replace function public.request_password_reset(p_email text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from auth.users
  where email = lower(trim(p_email))
  limit 1;

  if v_user_id is null then
    return; -- silently ignore
  end if;

  -- Garante no máximo 1 request ativo por usuário (unique index)
  insert into public.password_reset_requests (user_id, email, source)
  values (v_user_id, lower(trim(p_email)), 'user_request')
  on conflict do nothing;
end $$;

revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated, service_role;

-- ── RPC: consume_password_reset ───────────────────────────
-- Retorna user_id se token/code válido, senão lança exceção
create or replace function public.consume_password_reset(
  p_token_hash bytea,
  p_short_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.password_reset_requests;
begin
  if p_token_hash is not null then
    select * into v_req
    from public.password_reset_requests
    where token_hash = p_token_hash
      and status = 'approved'
      and expires_at > now()
    for update;
  else
    select * into v_req
    from public.password_reset_requests
    where short_code = upper(p_short_code)
      and status = 'approved'
      and expires_at > now()
    for update;
  end if;

  if v_req.id is null then
    raise exception 'reset_request_not_found';
  end if;

  update public.password_reset_requests
  set status       = 'consumed',
      consumed_at  = now()
  where id = v_req.id;

  return v_req.user_id;
end $$;

revoke all on function public.consume_password_reset(bytea, text) from public, anon;
grant execute on function public.consume_password_reset(bytea, text) to authenticated, service_role;
