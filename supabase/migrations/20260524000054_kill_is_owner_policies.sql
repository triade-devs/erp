-- 20260524000054_kill_is_owner_policies.sql
-- PR #D2 da evolução de roles: owner deixa de ser boolean denormalizado.
-- Fonte de verdade passa a ser membership_roles + roles.code = 'owner'.
-- Coluna renomeada para legacy_is_owner (deprecação); drop em follow-up.

-- ─── 1. Backfill: garante role 'owner' para todo membership com is_owner=true ─
insert into public.membership_roles (membership_id, role_id)
  select m.id, r.id
  from public.memberships m
  join public.roles r on r.company_id = m.company_id and r.code = 'owner'
  where m.is_owner = true
  on conflict do nothing;

-- ─── 2. Helper para checar owner por membership ──────────────────────────────
-- Reutilizado em policies e queries downstream
create or replace function public.is_membership_owner(p_membership_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.membership_roles mr
    join public.roles r on r.id = mr.role_id
    where mr.membership_id = p_membership_id
      and r.code = 'owner'
  )
$$;

comment on function public.is_membership_owner(uuid) is
  'PR #D2: substitui memberships.is_owner. True se o membership tem a role owner via membership_roles.';

-- ─── 3. Policies que dependiam de is_owner ───────────────────────────────────

-- companies_update_platform_or_owner (definida em 20260420000006_helpers_and_policies.sql
-- e revisitada em 20260422000009_fix_companies_update_rls.sql): substitui 'and is_owner'
-- por EXISTS join via membership_roles.
drop policy if exists "companies_update_platform_or_owner" on public.companies;
create policy "companies_update_platform_or_owner" on public.companies
  for update using (
    public.is_platform_admin()
    or exists (
      select 1
      from public.memberships m
      join public.membership_roles mr on mr.membership_id = m.id
      join public.roles r on r.id = mr.role_id
      where m.user_id = auth.uid()
        and m.company_id = companies.id
        and m.status = 'active'
        and r.code = 'owner'
    )
  );

-- memberships_delete (definida em 20260502000033_memberships_delete_policy.sql):
-- substitui 'not is_owner' por not is_membership_owner.
drop policy if exists "memberships_delete" on public.memberships;
create policy "memberships_delete" on public.memberships
  for delete using (
    (
      public.is_platform_admin()
      or public.has_permission(company_id, 'core:member:manage')
    )
    and not public.is_membership_owner(id)
  );

-- ─── 4. Function actor_can_manage_reset (definida em 20260504000036): ────────
-- Substitui ref direta a target_m.is_owner por is_membership_owner(target_m.id).
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
      -- PR #D2: company owner não pode resetar outro owner (via membership_roles)
      and not (public.is_membership_owner(target_m.id) and not is_platform_admin())
  )
$$;

-- ─── 5. Rename column para sinalizar deprecação ──────────────────────────────
alter table public.memberships rename column is_owner to legacy_is_owner;

comment on column public.memberships.legacy_is_owner is
  'PR #D2 DEPRECATED: usar membership_roles + roles.code=''owner''. Coluna mantida por 1 release para rollback rápido; drop em follow-up.';
