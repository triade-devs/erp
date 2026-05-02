-- ============================================================
-- Medical Records Module
-- Prontuário médico: pacientes, consultas, anamnese, prescrições
-- e termos de consentimento com vínculo profissional-paciente.
-- ============================================================

create type public.medical_assignment_relationship as enum (
  'primary_physician',
  'physician',
  'nursing',
  'assistant',
  'therapist',
  'other'
);

create table public.medical_patients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  document text,
  birth_date date,
  sex text check (sex in ('female', 'male', 'other', 'unknown')) default 'unknown',
  phone text,
  email text,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  is_archived boolean not null default false,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index medical_patients_company_name_idx
  on public.medical_patients (company_id, full_name);
create index medical_patients_company_document_idx
  on public.medical_patients (company_id, document)
  where document is not null;

create table public.medical_patient_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id uuid not null references public.medical_patients(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  relationship public.medical_assignment_relationship not null default 'physician',
  is_primary boolean not null default false,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  notes text,
  constraint medical_assignments_company_patient_unique
    unique (company_id, patient_id, membership_id, relationship)
);

create unique index medical_assignments_one_primary_active_idx
  on public.medical_patient_assignments (company_id, patient_id)
  where is_primary and ended_at is null;
create index medical_assignments_membership_idx
  on public.medical_patient_assignments (company_id, membership_id)
  where ended_at is null;

create table public.medical_consultations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id uuid not null references public.medical_patients(id) on delete cascade,
  consultation_at timestamptz not null default now(),
  chief_complaint text,
  clinical_evolution text,
  diagnosis_text text,
  conduct text,
  notes text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index medical_consultations_patient_date_idx
  on public.medical_consultations (company_id, patient_id, consultation_at desc);

create table public.medical_anamnesis_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  specialty text,
  schema_json jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medical_anamneses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id uuid not null references public.medical_patients(id) on delete cascade,
  consultation_id uuid references public.medical_consultations(id) on delete set null,
  template_id uuid references public.medical_anamnesis_templates(id) on delete set null,
  answers_json jsonb not null default '{}'::jsonb,
  summary text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index medical_anamneses_patient_idx
  on public.medical_anamneses (company_id, patient_id, created_at desc);

create table public.medical_prescriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id uuid not null references public.medical_patients(id) on delete cascade,
  consultation_id uuid references public.medical_consultations(id) on delete set null,
  issued_at timestamptz not null default now(),
  general_instructions text,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.medical_prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.medical_prescriptions(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  medication text not null,
  dosage text,
  route text,
  frequency text,
  duration text,
  quantity text,
  instructions text,
  position int not null default 0
);

create index medical_prescriptions_patient_idx
  on public.medical_prescriptions (company_id, patient_id, issued_at desc);

create table public.medical_consent_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  version int not null default 1,
  body text not null,
  is_active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, title, version)
);

create table public.medical_patient_consents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id uuid not null references public.medical_patients(id) on delete cascade,
  template_id uuid references public.medical_consent_templates(id) on delete set null,
  template_title text not null,
  template_version int not null,
  accepted_body text not null,
  accepted_by uuid references auth.users(id),
  accepted_at timestamptz not null default now(),
  notes text
);

create index medical_consents_patient_idx
  on public.medical_patient_consents (company_id, patient_id, accepted_at desc);

create table public.medical_attachment_metadata (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  patient_id uuid not null references public.medical_patients(id) on delete cascade,
  consultation_id uuid references public.medical_consultations(id) on delete set null,
  file_name text not null,
  file_type text,
  file_size_bytes bigint,
  storage_path text,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.has_medical_patient_access(p_company uuid, p_patient uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    public.has_permission(p_company, 'medical:patient:read_all')
    or exists (
      select 1
      from public.medical_patients p
      where p.company_id = p_company
        and p.id = p_patient
        and p.created_by = auth.uid()
    )
    or (
      public.has_permission(p_company, 'medical:patient:read_assigned')
      and exists (
        select 1
        from public.medical_patient_assignments a
        join public.memberships m on m.id = a.membership_id
        where a.company_id = p_company
          and a.patient_id = p_patient
          and a.ended_at is null
          and m.company_id = p_company
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
$$;

create or replace function public.medical_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_medical_patients_updated_at
  before update on public.medical_patients
  for each row execute function public.medical_touch_updated_at();
create trigger trg_medical_consultations_updated_at
  before update on public.medical_consultations
  for each row execute function public.medical_touch_updated_at();
create trigger trg_medical_anamnesis_templates_updated_at
  before update on public.medical_anamnesis_templates
  for each row execute function public.medical_touch_updated_at();
create trigger trg_medical_anamneses_updated_at
  before update on public.medical_anamneses
  for each row execute function public.medical_touch_updated_at();
create trigger trg_medical_prescriptions_updated_at
  before update on public.medical_prescriptions
  for each row execute function public.medical_touch_updated_at();
create trigger trg_medical_consent_templates_updated_at
  before update on public.medical_consent_templates
  for each row execute function public.medical_touch_updated_at();

alter table public.medical_patients enable row level security;
alter table public.medical_patient_assignments enable row level security;
alter table public.medical_consultations enable row level security;
alter table public.medical_anamnesis_templates enable row level security;
alter table public.medical_anamneses enable row level security;
alter table public.medical_prescriptions enable row level security;
alter table public.medical_prescription_items enable row level security;
alter table public.medical_consent_templates enable row level security;
alter table public.medical_patient_consents enable row level security;
alter table public.medical_attachment_metadata enable row level security;

create policy "medical_patients_select" on public.medical_patients
  for select using (public.has_medical_patient_access(company_id, id));
create policy "medical_patients_insert" on public.medical_patients
  for insert with check (public.has_permission(company_id, 'medical:patient:create'));
create policy "medical_patients_update" on public.medical_patients
  for update using (
    public.has_permission(company_id, 'medical:patient:update')
    and public.has_medical_patient_access(company_id, id)
  ) with check (
    public.has_permission(company_id, 'medical:patient:update')
    and public.has_medical_patient_access(company_id, id)
  );

create policy "medical_assignments_select" on public.medical_patient_assignments
  for select using (
    public.has_permission(company_id, 'medical:patient:assign')
    or public.has_medical_patient_access(company_id, patient_id)
  );
create policy "medical_assignments_insert" on public.medical_patient_assignments
  for insert with check (
    public.has_permission(company_id, 'medical:patient:assign')
    or (
      public.has_permission(company_id, 'medical:patient:create')
      and exists (
        select 1 from public.medical_patients p
        where p.id = patient_id
          and p.company_id = company_id
          and p.created_by = auth.uid()
      )
      and exists (
        select 1 from public.memberships m
        where m.id = membership_id
          and m.company_id = company_id
          and m.user_id = auth.uid()
          and m.status = 'active'
      )
    )
  );
create policy "medical_assignments_update" on public.medical_patient_assignments
  for update using (public.has_permission(company_id, 'medical:patient:assign'))
  with check (public.has_permission(company_id, 'medical:patient:assign'));
create policy "medical_assignments_delete" on public.medical_patient_assignments
  for delete using (public.has_permission(company_id, 'medical:patient:assign'));

create policy "medical_consultations_select" on public.medical_consultations
  for select using (
    public.has_permission(company_id, 'medical:consultation:read')
    and public.has_medical_patient_access(company_id, patient_id)
  );
create policy "medical_consultations_write" on public.medical_consultations
  for all using (
    public.has_permission(company_id, 'medical:consultation:write')
    and public.has_medical_patient_access(company_id, patient_id)
  ) with check (
    public.has_permission(company_id, 'medical:consultation:write')
    and public.has_medical_patient_access(company_id, patient_id)
  );

create policy "medical_anamnesis_templates_select" on public.medical_anamnesis_templates
  for select using (company_id in (select public.user_company_ids()));
create policy "medical_anamnesis_templates_write" on public.medical_anamnesis_templates
  for all using (public.has_permission(company_id, 'medical:anamnesis:manage_templates'))
  with check (public.has_permission(company_id, 'medical:anamnesis:manage_templates'));

create policy "medical_anamneses_select" on public.medical_anamneses
  for select using (
    public.has_permission(company_id, 'medical:anamnesis:read')
    and public.has_medical_patient_access(company_id, patient_id)
  );
create policy "medical_anamneses_write" on public.medical_anamneses
  for all using (
    public.has_permission(company_id, 'medical:anamnesis:write')
    and public.has_medical_patient_access(company_id, patient_id)
  ) with check (
    public.has_permission(company_id, 'medical:anamnesis:write')
    and public.has_medical_patient_access(company_id, patient_id)
  );

create policy "medical_prescriptions_select" on public.medical_prescriptions
  for select using (
    public.has_permission(company_id, 'medical:prescription:read')
    and public.has_medical_patient_access(company_id, patient_id)
  );
create policy "medical_prescriptions_write" on public.medical_prescriptions
  for all using (
    public.has_permission(company_id, 'medical:prescription:write')
    and public.has_medical_patient_access(company_id, patient_id)
  ) with check (
    public.has_permission(company_id, 'medical:prescription:write')
    and public.has_medical_patient_access(company_id, patient_id)
  );
create policy "medical_prescription_items_select" on public.medical_prescription_items
  for select using (
    exists (
      select 1 from public.medical_prescriptions p
      where p.id = prescription_id
        and public.has_permission(p.company_id, 'medical:prescription:read')
        and public.has_medical_patient_access(p.company_id, p.patient_id)
    )
  );
create policy "medical_prescription_items_write" on public.medical_prescription_items
  for all using (
    exists (
      select 1 from public.medical_prescriptions p
      where p.id = prescription_id
        and public.has_permission(p.company_id, 'medical:prescription:write')
        and public.has_medical_patient_access(p.company_id, p.patient_id)
    )
  ) with check (
    exists (
      select 1 from public.medical_prescriptions p
      where p.id = prescription_id
        and p.company_id = company_id
        and public.has_permission(p.company_id, 'medical:prescription:write')
        and public.has_medical_patient_access(p.company_id, p.patient_id)
    )
  );

create policy "medical_consent_templates_select" on public.medical_consent_templates
  for select using (
    company_id in (select public.user_company_ids())
    and public.has_permission(company_id, 'medical:consent:read')
  );
create policy "medical_consent_templates_write" on public.medical_consent_templates
  for all using (public.has_permission(company_id, 'medical:consent:manage'))
  with check (public.has_permission(company_id, 'medical:consent:manage'));

create policy "medical_patient_consents_select" on public.medical_patient_consents
  for select using (
    public.has_permission(company_id, 'medical:consent:read')
    and public.has_medical_patient_access(company_id, patient_id)
  );
create policy "medical_patient_consents_insert" on public.medical_patient_consents
  for insert with check (
    public.has_permission(company_id, 'medical:consent:accept')
    and public.has_medical_patient_access(company_id, patient_id)
  );

create policy "medical_attachment_metadata_select" on public.medical_attachment_metadata
  for select using (
    public.has_permission(company_id, 'medical:attachment:read')
    and public.has_medical_patient_access(company_id, patient_id)
  );
create policy "medical_attachment_metadata_write" on public.medical_attachment_metadata
  for all using (
    public.has_permission(company_id, 'medical:attachment:manage_metadata')
    and public.has_medical_patient_access(company_id, patient_id)
  ) with check (
    public.has_permission(company_id, 'medical:attachment:manage_metadata')
    and public.has_medical_patient_access(company_id, patient_id)
  );

insert into public.modules (code, name, description, icon, is_system, sort_order) values
  ('medical-records', 'Prontuário', 'Prontuário médico e acompanhamento clínico', 'stethoscope', false, 40)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

insert into public.permissions (code, module_code, resource, action, description) values
  ('medical:patient:read_all', 'medical-records', 'patient', 'read_all', 'Ver todos os pacientes da empresa'),
  ('medical:patient:read_assigned', 'medical-records', 'patient', 'read_assigned', 'Ver pacientes vinculados'),
  ('medical:patient:create', 'medical-records', 'patient', 'create', 'Cadastrar pacientes'),
  ('medical:patient:update', 'medical-records', 'patient', 'update', 'Editar pacientes'),
  ('medical:patient:archive', 'medical-records', 'patient', 'archive', 'Arquivar pacientes'),
  ('medical:patient:assign', 'medical-records', 'patient', 'assign', 'Vincular profissionais a pacientes'),
  ('medical:consultation:read', 'medical-records', 'consultation', 'read', 'Ver consultas'),
  ('medical:consultation:write', 'medical-records', 'consultation', 'write', 'Criar e editar consultas'),
  ('medical:anamnesis:read', 'medical-records', 'anamnesis', 'read', 'Ver anamneses'),
  ('medical:anamnesis:write', 'medical-records', 'anamnesis', 'write', 'Criar e editar anamneses'),
  ('medical:anamnesis:manage_templates', 'medical-records', 'anamnesis', 'manage_templates', 'Gerenciar templates de anamnese'),
  ('medical:prescription:read', 'medical-records', 'prescription', 'read', 'Ver prescrições'),
  ('medical:prescription:write', 'medical-records', 'prescription', 'write', 'Criar e editar prescrições'),
  ('medical:consent:read', 'medical-records', 'consent', 'read', 'Ver termos e consentimentos'),
  ('medical:consent:manage', 'medical-records', 'consent', 'manage', 'Gerenciar modelos de termos'),
  ('medical:consent:accept', 'medical-records', 'consent', 'accept', 'Registrar aceite de termos'),
  ('medical:attachment:read', 'medical-records', 'attachment', 'read', 'Ver metadados de anexos'),
  ('medical:attachment:manage_metadata', 'medical-records', 'attachment', 'manage_metadata', 'Gerenciar metadados de anexos')
on conflict (code) do update set
  module_code = excluded.module_code,
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description;

insert into public.company_modules (company_id, module_code)
select id, 'medical-records' from public.companies
on conflict do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code in ('owner', 'manager')
  and p.module_code = 'medical-records'
on conflict do nothing;

insert into public.role_permissions (role_id, permission_code)
select r.id, p.code
from public.roles r
cross join public.permissions p
where r.code = 'operator'
  and p.code in (
    'medical:patient:read_assigned',
    'medical:patient:create',
    'medical:patient:update',
    'medical:consultation:read',
    'medical:consultation:write',
    'medical:anamnesis:read',
    'medical:anamnesis:write',
    'medical:prescription:read',
    'medical:prescription:write',
    'medical:consent:read',
    'medical:consent:accept',
    'medical:attachment:read'
  )
on conflict do nothing;

insert into public.medical_anamnesis_templates (company_id, name, specialty, schema_json)
select
  c.id,
  'Anamnese geral',
  null,
  '{
    "sections": [
      {"key": "history", "label": "Histórico clínico"},
      {"key": "allergies", "label": "Alergias"},
      {"key": "medications", "label": "Medicamentos em uso"},
      {"key": "family_history", "label": "Histórico familiar"},
      {"key": "habits", "label": "Hábitos de vida"}
    ]
  }'::jsonb
from public.companies c
where not exists (
  select 1 from public.medical_anamnesis_templates t
  where t.company_id = c.id and t.name = 'Anamnese geral'
);
