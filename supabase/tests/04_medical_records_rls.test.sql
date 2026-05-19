begin;

select plan(5);

select has_table('public', 'medical_patients', 'medical_patients existe');
select has_table('public', 'medical_patient_assignments', 'medical_patient_assignments existe');
select has_function('public', 'has_medical_patient_access', ARRAY['uuid', 'uuid'], 'helper de acesso existe');

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'medical_patients'
      and policyname = 'medical_patients_select'
  ),
  'medical_patients_select existe'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'medical_consultations'
      and policyname = 'medical_consultations_write'
  ),
  'medical_consultations_write existe'
);

select * from finish();
rollback;
