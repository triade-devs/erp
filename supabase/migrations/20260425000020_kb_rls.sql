-- ============================================================
-- 20 — KNOWLEDGE BASE — RLS
-- Padrão idêntico a 20260423000016_movements_rls.sql
-- ============================================================

alter table public.kb_categories        enable row level security;
alter table public.kb_articles          enable row level security;
alter table public.kb_article_revisions enable row level security;
alter table public.kb_article_chunks    enable row level security;
alter table public.kb_videos            enable row level security;

-- ─── kb_categories ───────────────────────────────────────────

create policy "kb_categories_select"
  on public.kb_categories for select
  using (company_id in (select public.user_company_ids()));

create policy "kb_categories_insert"
  on public.kb_categories for insert
  with check (public.has_permission(company_id, 'kb:article:write'));

create policy "kb_categories_update"
  on public.kb_categories for update
  using (public.has_permission(company_id, 'kb:article:write'));

create policy "kb_categories_delete"
  on public.kb_categories for delete
  using (public.has_permission(company_id, 'kb:article:write'));

-- ─── kb_articles ─────────────────────────────────────────────

create policy "kb_articles_select"
  on public.kb_articles for select
  using (
    company_id in (select public.user_company_ids())
    and (status = 'published' or public.has_permission(company_id, 'kb:article:write'))
  );

create policy "kb_articles_insert"
  on public.kb_articles for insert
  with check (public.has_permission(company_id, 'kb:article:write'));

create policy "kb_articles_update"
  on public.kb_articles for update
  using (public.has_permission(company_id, 'kb:article:write'));

create policy "kb_articles_delete"
  on public.kb_articles for delete
  using (public.has_permission(company_id, 'kb:article:write'));

-- ─── kb_article_revisions ────────────────────────────────────

create policy "kb_article_revisions_select"
  on public.kb_article_revisions for select
  using (
    article_id in (
      select id from public.kb_articles
      where company_id in (select public.user_company_ids())
    )
    and exists (
      select 1 from public.kb_articles a
      where a.id = article_id
        and public.has_permission(a.company_id, 'kb:article:write')
    )
  );

-- Revisões são criadas apenas pelo trigger (sem policy de insert/update/delete para usuários)

-- ─── kb_article_chunks ───────────────────────────────────────

create policy "kb_chunks_select"
  on public.kb_article_chunks for select
  using (company_id in (select public.user_company_ids()));

-- Chunks são gerenciados por serviços server-side (service role); sem policies de escrita para usuários

-- ─── kb_videos ───────────────────────────────────────────────

create policy "kb_videos_select"
  on public.kb_videos for select
  using (company_id in (select public.user_company_ids()));

create policy "kb_videos_insert"
  on public.kb_videos for insert
  with check (public.has_permission(company_id, 'kb:article:write'));

create policy "kb_videos_update"
  on public.kb_videos for update
  using (public.has_permission(company_id, 'kb:article:write'));
