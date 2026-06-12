-- 20260612000054_rental_request_cycle.sql
-- Ciclo de solicitação (spec 2026-06-11), parte 2:
-- constraint cobre pending, novas permissões/role e RLS do fluxo.

-- ─── 1. Pendência trava o slot (fonte da verdade no banco) ──────────────────
alter table public.space_rentals drop constraint if exists space_rentals_no_overlap;
alter table public.space_rentals
  add constraint space_rentals_no_overlap
  exclude using gist (space_id with =, period with &&)
  where (status in ('confirmed', 'pending'));

-- ─── 2. Permissões novas ─────────────────────────────────────────────────────
insert into public.permissions (code, module_code, resource, action, description) values
  ('spaces:rental:request', 'spaces', 'rental', 'request', 'Solicitar reserva de espaço para si'),
  ('spaces:rental:approve', 'spaces', 'rental', 'approve', 'Aprovar ou recusar solicitações de reserva')
on conflict (code) do nothing;

-- ─── 3. Templates ────────────────────────────────────────────────────────────
insert into public.role_templates (code, name, description, is_system, sort_order) values
  ('espacos-solicitante', 'Solicitante de Espaços', 'Vê o calendário e solicita reservas para si', true, 65)
on conflict (code) do nothing;

update public.role_templates set parent_template_code = 'admin'
 where code = 'espacos-solicitante';

insert into public.template_permissions (template_code, permission_code) values
  ('espacos-solicitante', 'spaces:space:read'),
  ('espacos-solicitante', 'spaces:rental:read'),
  ('espacos-solicitante', 'spaces:rental:request'),
  ('espacos-gestao',      'spaces:rental:approve'),
  ('admin',               'spaces:rental:request'),
  ('admin',               'spaces:rental:approve')
on conflict do nothing;

-- ─── 4. Instancia/atualiza roles nas empresas com módulo spaces ativo ────────
insert into public.roles (company_id, code, name, description, is_system, template_code, template_synced_at, parent_role_id)
select cm.company_id, t.code, t.name, t.description, true, t.code, now(), a.id
from public.company_modules cm
join public.roles a on a.company_id = cm.company_id and a.code = 'admin'
join public.role_templates t on t.code = 'espacos-solicitante'
where cm.module_code = 'spaces'
on conflict (company_id, code) do nothing;

insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, tp.permission_code, true
from public.roles r
join public.template_permissions tp on tp.template_code = r.template_code
where r.code = 'espacos-solicitante'
on conflict (role_id, permission_code) do nothing;

insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, 'spaces:rental:approve', true
from public.roles r where r.code = 'espacos-gestao'
on conflict (role_id, permission_code) do nothing;

insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r
cross join (values ('spaces:rental:request'), ('spaces:rental:approve')) as p(code)
where r.code = 'admin'
on conflict (role_id, permission_code) do nothing;

-- ─── 5. RLS ──────────────────────────────────────────────────────────────────
-- INSERT: gestor cria direto (create) OU solicitante cria pendência para si
drop policy if exists "space_rentals_insert" on public.space_rentals;
create policy "space_rentals_insert" on public.space_rentals
  for insert with check (
    public.has_permission(company_id, 'spaces:rental:create')
    or (
      public.has_permission(company_id, 'spaces:rental:request')
      and renter_user_id = auth.uid()
      and status = 'pending'
    )
  );

-- UPDATE: gestor cancela; gestor com approve decide; locatário pode
-- EDITAR a própria pendência (continua pending) ou CANCELAR/retirar o
-- que é dele — mas nunca se auto-aprovar (resultado confirmed bloqueado).
drop policy if exists "space_rentals_update" on public.space_rentals;
create policy "space_rentals_update" on public.space_rentals
  for update
  using (
    public.has_permission(company_id, 'spaces:rental:cancel')
    or public.has_permission(company_id, 'spaces:rental:approve')
    or renter_user_id = auth.uid()
  )
  with check (
    public.has_permission(company_id, 'spaces:rental:cancel')
    or public.has_permission(company_id, 'spaces:rental:approve')
    or (renter_user_id = auth.uid() and status in ('pending', 'cancelled'))
  );
