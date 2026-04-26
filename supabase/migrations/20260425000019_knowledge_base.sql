-- ============================================================
-- 19 — KNOWLEDGE BASE
-- Manual operacional editável + busca FTS/semântica + vídeos
-- ============================================================

create extension if not exists vector;
create extension if not exists pg_trgm;

-- 1) Categorias (árvore simples, parent_id opcional)
create table public.kb_categories (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  parent_id   uuid references public.kb_categories(id) on delete set null,
  slug        text not null,
  title       text not null,
  audience    text not null check (audience in ('user','dev','both')) default 'user',
  position    int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (company_id, slug)
);

-- 2) Vídeos Remotion (declarado antes de kb_articles por FK)
create table public.kb_videos (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  composition    text not null,
  title          text not null,
  description    text,
  status         text not null check (status in ('queued','rendering','ready','failed')) default 'queued',
  storage_path   text,
  duration_s     numeric,
  thumbnail_path text,
  input_props    jsonb,
  created_by     uuid references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 3) Artigos (conteúdo Tiptap salvo como JSON + markdown derivado)
create table public.kb_articles (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  category_id     uuid references public.kb_categories(id) on delete set null,
  slug            text not null,
  title           text not null,
  summary         text,
  content_json    jsonb not null,
  content_md      text  not null,
  status          text  not null check (status in ('draft','published','archived')) default 'draft',
  audience        text  not null check (audience in ('user','dev','both')) default 'user',
  related_module  text,
  related_table   text,
  video_id        uuid references public.kb_videos(id) on delete set null,
  search_vector   tsvector
    generated always as (
      setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(summary, '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(content_md, '')), 'C')
    ) stored,
  created_by      uuid references auth.users(id),
  updated_by      uuid references auth.users(id),
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (company_id, slug)
);
create index kb_articles_search_idx on public.kb_articles using gin (search_vector);
create index kb_articles_company_status_idx on public.kb_articles (company_id, status);

-- 4) Histórico de revisões
create table public.kb_article_revisions (
  id           uuid primary key default gen_random_uuid(),
  article_id   uuid not null references public.kb_articles(id) on delete cascade,
  content_json jsonb not null,
  content_md   text  not null,
  edited_by    uuid references auth.users(id),
  edited_at    timestamptz not null default now()
);

-- 5) Embeddings para busca semântica e RAG
create table public.kb_article_chunks (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.kb_articles(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  chunk_index int  not null,
  content     text not null,
  embedding   vector(1536) not null,
  created_at  timestamptz not null default now(),
  unique (article_id, chunk_index)
);
create index kb_chunks_embedding_idx
  on public.kb_article_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 6) Trigger: ao salvar artigo, copia snapshot pra revisões e remove embeddings obsoletos
create or replace function public.kb_after_article_update()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and (old.content_json is distinct from new.content_json)) then
    insert into public.kb_article_revisions (article_id, content_json, content_md, edited_by)
    values (old.id, old.content_json, old.content_md, new.updated_by);
    delete from public.kb_article_chunks where article_id = new.id;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger trg_kb_after_article_update
before update on public.kb_articles
for each row execute function public.kb_after_article_update();
