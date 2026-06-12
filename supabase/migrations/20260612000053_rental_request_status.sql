-- 20260612000053_rental_request_status.sql
-- Ciclo de solicitação (spec 2026-06-11): novos status do aluguel + batch.
-- ALTER TYPE ADD VALUE não pode ser usado na mesma transação que o cria —
-- constraint/policies que referenciam 'pending' ficam na migration 054.

alter type public.rental_status add value if not exists 'pending' before 'confirmed';
alter type public.rental_status add value if not exists 'rejected';

-- Agrupa os slots de uma mesma solicitação (null = reserva direta do gestor)
alter table public.space_rentals
  add column if not exists request_batch_id uuid;

create index if not exists idx_space_rentals_batch
  on public.space_rentals(request_batch_id)
  where request_batch_id is not null;

comment on column public.space_rentals.request_batch_id is
  'Spec 2026-06-11: agrupa os slots de uma mesma solicitação self-service. NULL em reservas diretas.';
