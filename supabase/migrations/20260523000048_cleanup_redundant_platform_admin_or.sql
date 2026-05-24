-- 20260523000048_cleanup_redundant_platform_admin_or.sql
-- PR #B cleanup: após has_permission() absorver is_platform_admin(),
-- o padrão 'public.is_platform_admin() OR public.has_permission(...)'
-- vira redundante. Esta migration recria 15 policies sem o OR.
--
-- Critério para inclusão nesta migration: policy combina is_platform_admin
-- com has_permission via OR. Policies que usam is_platform_admin sozinho
-- (gating de plataforma, sem has_permission) NÃO entram.

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert with check (public.has_permission(company_id, 'inventory:product:create'));

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update
  using (public.has_permission(company_id, 'inventory:product:update'))
  with check (public.has_permission(company_id, 'inventory:product:update'));

drop policy if exists "products_delete" on public.products;
create policy "products_delete" on public.products
  for delete using (public.has_permission(company_id, 'inventory:product:delete'));

-- ─── STOCK MOVEMENTS ─────────────────────────────────────────────────────────
drop policy if exists "movements_insert" on public.stock_movements;
create policy "movements_insert" on public.stock_movements
  for insert with check (public.has_permission(company_id, 'movements:movement:create'));

-- ─── KB CATEGORIES ────────────────────────────────────────────────────────────
drop policy if exists "kb_categories_insert" on public.kb_categories;
create policy "kb_categories_insert" on public.kb_categories
  for insert with check (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_categories_update" on public.kb_categories;
create policy "kb_categories_update" on public.kb_categories
  for update using (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_categories_delete" on public.kb_categories;
create policy "kb_categories_delete" on public.kb_categories
  for delete using (public.has_permission(company_id, 'kb:article:write'));

-- ─── KB ARTICLES ─────────────────────────────────────────────────────────────
drop policy if exists "kb_articles_insert" on public.kb_articles;
create policy "kb_articles_insert" on public.kb_articles
  for insert with check (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_articles_update" on public.kb_articles;
create policy "kb_articles_update" on public.kb_articles
  for update using (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_articles_delete" on public.kb_articles;
create policy "kb_articles_delete" on public.kb_articles
  for delete using (public.has_permission(company_id, 'kb:article:write'));

-- ─── KB VIDEOS ───────────────────────────────────────────────────────────────
drop policy if exists "kb_videos_insert" on public.kb_videos;
create policy "kb_videos_insert" on public.kb_videos
  for insert with check (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_videos_update" on public.kb_videos;
create policy "kb_videos_update" on public.kb_videos
  for update using (public.has_permission(company_id, 'kb:article:write'));

drop policy if exists "kb_videos_delete" on public.kb_videos;
create policy "kb_videos_delete" on public.kb_videos
  for delete using (public.has_permission(company_id, 'kb:article:write'));
