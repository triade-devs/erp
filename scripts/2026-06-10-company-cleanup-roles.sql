-- 2026-06-10-company-cleanup-roles.sql
-- Spec: docs/superpowers/specs/2026-06-10-company-cleanup-roles-redesign-design.md
-- Executar UMA vez em produção, DEPOIS das migrations 049/050.
-- Tudo em uma transação; asserts no final abortam em caso de inconsistência.

begin;

-- ─── 0. Backup lógico das tabelas afetadas ──────────────────────────────────
create schema if not exists backup_20260610;
create table backup_20260610.companies        as table public.companies;
create table backup_20260610.roles            as table public.roles;
create table backup_20260610.role_permissions as table public.role_permissions;
create table backup_20260610.memberships      as table public.memberships;
create table backup_20260610.membership_roles as table public.membership_roles;

-- ─── 1. Captura atribuições atuais das empresas mantidas ────────────────────
create temp table old_assignments on commit drop as
select m.user_id, m.company_id, r.code as old_code
from public.membership_roles mr
join public.memberships m on m.id = mr.membership_id
join public.roles r       on r.id = mr.role_id
join public.companies c   on c.id = m.company_id
where c.slug in ('default-company', 'hc-ufpr');

-- ─── 2. Órfãos: usuários cujas memberships estão todas em empresas a apagar ─
create temp table orphan_users on commit drop as
select distinct m.user_id
from public.memberships m
where m.user_id not in (
  select m2.user_id
  from public.memberships m2
  join public.companies c2 on c2.id = m2.company_id
  where c2.slug in ('default-company', 'hc-ufpr')
);

insert into public.memberships (user_id, company_id, status, joined_at)
select o.user_id, c.id, 'active', now()
from orphan_users o
cross join (select id from public.companies where slug = 'default-company') c
on conflict (user_id, company_id) do nothing;

-- ─── 3. Apaga as demais empresas (cascade limpa dados relacionados) ─────────
delete from public.companies
where slug not in ('default-company', 'hc-ufpr');

-- ─── 4. Revoga convites pendentes das empresas mantidas ─────────────────────
-- (role_ids uuid[] apontaria para roles apagadas no passo 5)
update public.company_invitations
set status = 'revoked', revoked_at = now()
where status = 'pending';

-- ─── 5. Apaga roles das empresas mantidas ───────────────────────────────────
-- (cascade limpa role_permissions, membership_roles, role_scopes, role_field_rules)
delete from public.roles;

-- ─── 6. Recria roles ────────────────────────────────────────────────────────
-- Default: admin, estoque-gestao, estoque-operacao, estoque-leitura, kb-editor
-- HC-UFPR: admin, prontuario-medico, prontuario-leitura, anestesia
-- trigger check_role_hierarchy seta hierarchy_level a partir de parent_role_id.

-- 6a. admin nas duas empresas (nível 0)
insert into public.roles (company_id, code, name, description, is_system, template_code, template_synced_at)
select c.id, 'admin', 'Admin', 'Acesso total à empresa', true, 'admin', now()
from public.companies c
where c.slug in ('default-company', 'hc-ufpr');

-- 6b. demais roles da Default (filhas de admin)
insert into public.roles (company_id, code, name, description, is_system, template_code, template_synced_at, parent_role_id)
select c.id, t.code, t.name, t.description, true, t.code, now(), a.id
from public.companies c
join public.roles a on a.company_id = c.id and a.code = 'admin'
join public.role_templates t on t.code in ('estoque-gestao', 'estoque-operacao', 'estoque-leitura', 'kb-editor')
where c.slug = 'default-company';

-- 6c. roles custom do HC-UFPR (filhas de admin, sem template)
insert into public.roles (company_id, code, name, description, is_system, parent_role_id)
select c.id, v.code, v.name, v.description, false, a.id
from public.companies c
join public.roles a on a.company_id = c.id and a.code = 'admin'
cross join (values
  ('prontuario-medico',  'Prontuário — Médico',  'Cria e edita prontuários dos pacientes atribuídos'),
  ('prontuario-leitura', 'Prontuário — Leitura', 'Leitura dos prontuários dos pacientes atribuídos'),
  ('anestesia',          'Anestesia',            'Fichas de anestesia')
) as v(code, name, description)
where c.slug = 'hc-ufpr';

-- ─── 7. Permissões das roles ────────────────────────────────────────────────
-- admin: tudo
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r cross join public.permissions p
where r.code = 'admin';

-- roles instanciadas de template (Default): herdam template_permissions
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, tp.permission_code, true
from public.roles r
join public.template_permissions tp on tp.template_code = r.template_code
where r.code in ('estoque-gestao', 'estoque-operacao', 'estoque-leitura', 'kb-editor')
on conflict do nothing;

-- prontuario-medico
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r
join public.permissions p on p.code in (
  'medical:patient:read_assigned', 'medical:patient:create', 'medical:patient:update',
  'medical:anamnesis:read',        'medical:anamnesis:write',
  'medical:consultation:read',     'medical:consultation:write',
  'medical:prescription:read',     'medical:prescription:write',
  'medical:consent:read',          'medical:consent:accept',
  'medical:attachment:read'
)
where r.code = 'prontuario-medico';

-- prontuario-leitura (read_assigned + reads do prontuário — ver delta no plano)
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r
join public.permissions p on p.code in (
  'medical:patient:read_assigned',
  'medical:anamnesis:read', 'medical:consultation:read',
  'medical:prescription:read', 'medical:consent:read', 'medical:attachment:read'
)
where r.code = 'prontuario-leitura';

-- anestesia
insert into public.role_permissions (role_id, permission_code, is_active)
select r.id, p.code, true
from public.roles r
join public.permissions p on p.code in ('anestesia:ficha:read', 'anestesia:ficha:write')
where r.code = 'anestesia';

-- ─── 8. Reatribui usuários (mapeamento old → new, por empresa) ──────────────
insert into public.membership_roles (membership_id, role_id)
select distinct m.id, r.id
from old_assignments a
join (values
  ('owner',     'admin'),
  ('manager',   'estoque-gestao'),
  ('operator',  'estoque-operacao'),
  ('docs',      'kb-editor'),
  ('anestesia', 'anestesia')
) as map(old_code, new_code) on map.old_code = a.old_code
join public.roles r       on r.company_id = a.company_id and r.code = map.new_code
join public.memberships m on m.user_id = a.user_id and m.company_id = a.company_id
on conflict do nothing;

-- órfãos revinculados → estoque-leitura na Default
insert into public.membership_roles (membership_id, role_id)
select m.id, r.id
from orphan_users o
join public.companies c   on c.slug = 'default-company'
join public.memberships m on m.user_id = o.user_id and m.company_id = c.id
join public.roles r       on r.company_id = c.id and r.code = 'estoque-leitura'
on conflict do nothing;

-- ─── 9. Asserts: aborta a transação se algo ficou inconsistente ─────────────
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.companies;
  if v_count <> 2 then
    raise exception 'esperava 2 empresas, achei %', v_count;
  end if;

  select count(*) into v_count
  from public.memberships m
  where m.status = 'active'
    and not exists (select 1 from public.membership_roles mr where mr.membership_id = m.id);
  if v_count > 0 then
    raise exception '% memberships ativas sem nenhuma role', v_count;
  end if;

  select count(*) into v_count from public.roles where code = 'admin';
  if v_count <> 2 then
    raise exception 'esperava 2 roles admin (1 por empresa), achei %', v_count;
  end if;

  select count(*) into v_count
  from public.roles r
  where not exists (select 1 from public.role_permissions rp where rp.role_id = r.id);
  if v_count > 0 then
    raise exception '% roles sem nenhuma permissão', v_count;
  end if;
end $$;

commit;
