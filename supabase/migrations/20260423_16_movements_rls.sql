-- PR #26: Ativa RLS em stock_movements com policies baseadas em permissão RBAC
drop policy if exists "Authenticated users can manage stock_movements" on public.stock_movements;
drop policy if exists "movements_select" on public.stock_movements;
drop policy if exists "movements_insert" on public.stock_movements;

alter table public.stock_movements enable row level security;

-- Leitura: qualquer membro ativo da empresa
create policy "movements_select" on public.stock_movements
  for select using (company_id in (select public.user_company_ids()));

-- Criação: requer permissão explícita
create policy "movements_insert" on public.stock_movements
  for insert with check (public.has_permission(company_id, 'movements:movement:create'));
