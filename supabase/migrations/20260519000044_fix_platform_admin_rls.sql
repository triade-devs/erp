-- Fix: garantir que platform admins possam executar writes mesmo sem permissão
-- de role explícita (requirePermission() em TS já bypassa para admins, mas
-- has_permission() no Postgres não conhece platform_admins)

-- ─── PROFILES ────────────────────────────────────────────────────────────────
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_platform_admin());

-- ─── PRODUCTS ────────────────────────────────────────────────────────────────
drop policy if exists "products_insert" on public.products;
create policy "products_insert" on public.products
  for insert with check (
    public.is_platform_admin()
    or public.has_permission(company_id, 'inventory:product:create')
  );

drop policy if exists "products_update" on public.products;
create policy "products_update" on public.products
  for update
  using (public.is_platform_admin() or public.has_permission(company_id, 'inventory:product:update'))
  with check (public.is_platform_admin() or public.has_permission(company_id, 'inventory:product:update'));

drop policy if exists "products_delete" on public.products;
create policy "products_delete" on public.products
  for delete using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'inventory:product:delete')
  );

-- ─── STOCK MOVEMENTS ─────────────────────────────────────────────────────────
drop policy if exists "movements_insert" on public.stock_movements;
create policy "movements_insert" on public.stock_movements
  for insert with check (
    public.is_platform_admin()
    or public.has_permission(company_id, 'movements:movement:create')
  );

-- ─── KNOWLEDGE BASE ──────────────────────────────────────────────────────────
drop policy if exists "kb_categories_insert" on public.kb_categories;
create policy "kb_categories_insert" on public.kb_categories
  for insert with check (
    public.is_platform_admin()
    or public.has_permission(company_id, 'kb:article:write')
  );

drop policy if exists "kb_categories_update" on public.kb_categories;
create policy "kb_categories_update" on public.kb_categories
  for update using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'kb:article:write')
  );

drop policy if exists "kb_categories_delete" on public.kb_categories;
create policy "kb_categories_delete" on public.kb_categories
  for delete using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'kb:article:write')
  );

drop policy if exists "kb_articles_insert" on public.kb_articles;
create policy "kb_articles_insert" on public.kb_articles
  for insert with check (
    public.is_platform_admin()
    or public.has_permission(company_id, 'kb:article:write')
  );

drop policy if exists "kb_articles_update" on public.kb_articles;
create policy "kb_articles_update" on public.kb_articles
  for update using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'kb:article:write')
  );

drop policy if exists "kb_articles_delete" on public.kb_articles;
create policy "kb_articles_delete" on public.kb_articles
  for delete using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'kb:article:write')
  );

drop policy if exists "kb_videos_insert" on public.kb_videos;
create policy "kb_videos_insert" on public.kb_videos
  for insert with check (
    public.is_platform_admin()
    or public.has_permission(company_id, 'kb:article:write')
  );

drop policy if exists "kb_videos_update" on public.kb_videos;
create policy "kb_videos_update" on public.kb_videos
  for update using (
    public.is_platform_admin()
    or public.has_permission(company_id, 'kb:article:write')
  );
