create table public.product_classifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  level       text not null check (level in ('department','category','brand')),
  parent_id   uuid references public.product_classifications(id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_classifications_company on public.product_classifications(company_id);
create index idx_classifications_parent on public.product_classifications(parent_id);

-- Integridade hierárquica: department→null, category→department, brand→category
create or replace function public.check_classification_hierarchy()
returns trigger language plpgsql as $$
declare
  parent_level text;
begin
  if new.level = 'department' then
    if new.parent_id is not null then
      raise exception 'department não pode ter parent';
    end if;
  else
    if new.parent_id is null then
      raise exception '% requer parent', new.level;
    end if;
    select level into parent_level
    from public.product_classifications where id = new.parent_id;
    if new.level = 'category' and parent_level <> 'department' then
      raise exception 'category deve apontar para department';
    end if;
    if new.level = 'brand' and parent_level <> 'category' then
      raise exception 'brand deve apontar para category';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_classification_hierarchy
  before insert or update on public.product_classifications
  for each row execute function public.check_classification_hierarchy();

-- RLS (reutiliza permissão de edição de produtos para configuração de catálogo)
alter table public.product_classifications enable row level security;

create policy "classifications_select" on public.product_classifications
  for select using (company_id in (select public.user_company_ids()));

create policy "classifications_insert" on public.product_classifications
  for insert with check (public.has_permission(company_id, 'inventory:product:update'));

create policy "classifications_update" on public.product_classifications
  for update using (public.has_permission(company_id, 'inventory:product:update'))
  with check (public.has_permission(company_id, 'inventory:product:update'));

create policy "classifications_delete" on public.product_classifications
  for delete using (public.has_permission(company_id, 'inventory:product:update'));
