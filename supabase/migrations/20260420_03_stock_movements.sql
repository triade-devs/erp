-- Enum de tipo de movimentação
create type public.movement_type as enum ('in', 'out', 'adjustment');

-- Tabela de movimentações de estoque
create table public.stock_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete restrict,
  movement_type  public.movement_type not null,
  quantity       numeric(12,3) not null check (quantity > 0),
  unit_cost      numeric(12,2),
  reason         text,
  performed_by   uuid not null references auth.users(id),
  created_at     timestamptz not null default now()
);

-- Índice para histórico por produto
create index idx_stock_movements_product
  on public.stock_movements(product_id, created_at desc);

-- Trigger: atualiza products.stock de forma atômica após cada movimentação
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
as $$
begin
  if new.movement_type = 'in' then
    update public.products
      set stock = stock + new.quantity, updated_at = now()
      where id = new.product_id;

  elsif new.movement_type = 'out' then
    update public.products
      set stock = stock - new.quantity, updated_at = now()
      where id = new.product_id;

    -- Valida saldo negativo no banco (segunda linha de defesa após o service)
    if (select stock from public.products where id = new.product_id) < 0 then
      raise exception 'Estoque insuficiente para o produto %', new.product_id;
    end if;

  elsif new.movement_type = 'adjustment' then
    -- Ajuste absoluto: define o saldo diretamente
    update public.products
      set stock = new.quantity, updated_at = now()
      where id = new.product_id;
  end if;

  return new;
end $$;

create trigger trg_apply_stock_movement
  after insert on public.stock_movements
  for each row execute function public.apply_stock_movement();
