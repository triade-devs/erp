# Base de Conhecimento do ERP — Arquitetura

> **Status:** F3 em revisão (PR #24) · F2 em revisão (PR #23) · F1 concluído · 2026-04-29 · F0 concluído e em main · 2026-04-26
> **Autor:** Plano gerado por Claude a pedido de Yuri
> **Escopo:** Módulo `knowledge-base` para o ERP, com manual do usuário, documentação técnica, vídeos animados (Remotion), edição híbrida (MDX + UI) e camada de IA.

---

## 1. Objetivo

Criar dentro do próprio ERP uma base de conhecimento que cumpra três papéis:

1. **Manual do Usuário** — como operar o sistema (cadastros, fluxos, regras de negócio, exemplos visuais e vídeos curtos).
2. **Documentação Técnica** — modelo de dados, RLS, eventos de gatilho, contratos das Server Actions, ADRs, para devs e analistas.
3. **Apoio contínuo** — busca semântica, copiloto de IA para responder dúvidas e ajudar a redigir/atualizar conteúdo.

Princípios não-negociáveis (decorrentes do `CLAUDE.md`):

- Tudo em **português (pt-BR)**.
- Encaixar no padrão **`src/modules/<domain>/`** com barrel `index.ts` único.
- Toda Server Action retorna **`ActionResult`**.
- **RLS é a camada autoritativa** de permissão; checagem em TS é defesa em profundidade.
- Atualizar `MODULES_MENU` em `src/core/navigation/menu.ts` (não o layout).
- Não mexer em `products.stock` direto — manter a regra de que triggers do banco são fonte de verdade. Aqui não há essa preocupação porque o módulo é só leitura/escrita de conteúdo, mas a filosofia se aplica: **regras de negócio do conteúdo (slug único, versionamento, soft delete) ficam no banco**.

---

## 2. Decisões técnicas (resumo)

| Camada                          | Escolha                                                                                                    | Por quê                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Conteúdo "código" (devs)        | **MDX** + frontmatter, lido em build via `@next/mdx` ou `next-mdx-remote/rsc`                              | Versionado em Git, revisão por PR, type-safe via `zod` no frontmatter, render via React Server Components.     |
| Conteúdo "operacional" (admins) | **Tabela `kb_articles` no Supabase** + editor **Tiptap** (com extensão Markdown)                           | Edição em tempo real pelos admins, RLS por empresa, histórico de revisões nativo.                              |
| Diagramas de fluxo              | **Mermaid** (texto → SVG via `mermaid` lib client-side) e **React Flow** quando precisar de interatividade | Mermaid é trivial em MDX; React Flow para fluxogramas clicáveis (ex.: clicar no nó "Aprovação" abre o artigo). |
| Vídeos animados                 | **Remotion** (`@remotion/player` + `@remotion/renderer`)                                                   | Pedido explícito. Permite as 3 modalidades: pré-renderizado, player embutido, animação com dados reais.        |
| Busca                           | **Postgres FTS** (tsvector) + **pgvector** para busca semântica                                            | FTS resolve 80% dos casos; pgvector entra para "perguntas em linguagem natural".                               |
| IA                              | **Vercel AI SDK** (`ai` + `@ai-sdk/openai` ou `@ai-sdk/anthropic`)                                         | Integra direto com Server Actions e Streaming UI. Trocável de provider.                                        |
| Storage de mídia                | **Supabase Storage** bucket `knowledge-base`                                                               | Já temos Supabase; políticas de bucket espelham a RLS.                                                         |

---

## 3. Topologia de rotas

Aproveita os route groups existentes (`(auth)`, `(dashboard)`).

```
src/app/
├── (dashboard)/
│   └── [companySlug]/
│       ├── manual/                       ← Manual do Usuário (operacional)
│       │   ├── page.tsx                  ← Home: categorias + busca + destaques
│       │   ├── categoria/[slug]/page.tsx
│       │   ├── artigo/[slug]/page.tsx
│       │   ├── editor/                   ← Restrito a quem tem perm "kb:article:write"
│       │   │   ├── page.tsx              ← Lista de artigos editáveis
│       │   │   └── [id]/page.tsx         ← Editor Tiptap + IA copilot
│       │   └── busca/page.tsx            ← FTS + semântica
│       └── docs/                         ← Documentação Técnica (somente leitura, gerada de MDX)
│           ├── page.tsx                  ← Sumário
│           ├── arquitetura/[...slug]/page.tsx
│           ├── modulos/[modulo]/page.tsx
│           ├── tabelas/[tabela]/page.tsx ← Renderiza spec de tabela + RLS + diagrama
│           └── adrs/[id]/page.tsx
│
└── api/
    └── kb/
        ├── search/route.ts               ← POST { q } → resultados FTS + semânticos
        ├── chat/route.ts                 ← POST stream chat com RAG
        └── remotion/render/route.ts      ← POST inicia render de vídeo (server action também serve)
```

**Permissões novas (a inserir via migration `seed_core_permissions`):**

| Permission           | Para quê                                    |
| -------------------- | ------------------------------------------- |
| `kb:article:read`    | Ver artigos do manual                       |
| `kb:article:write`   | Criar/editar artigos via UI                 |
| `kb:article:publish` | Publicar/despublicar (gate de revisão)      |
| `kb:doc:read`        | Ver a doc técnica (geralmente só dev/admin) |
| `kb:ai:use`          | Usar copiloto de IA (controla custo)        |

---

## 4. Estrutura do módulo `knowledge-base`

Segue 1:1 o padrão de `src/modules/inventory/`.

```
src/modules/knowledge-base/
├── actions/
│   ├── create-article.ts            ← "use server", retorna ActionResult
│   ├── update-article.ts
│   ├── publish-article.ts
│   ├── delete-article.ts
│   ├── upsert-category.ts
│   ├── trigger-video-render.ts      ← Dispara job Remotion (pré-renderizado)
│   ├── ai-draft-article.ts          ← Gera rascunho com IA
│   └── ai-suggest-edit.ts           ← Sugere edição inline
├── queries/
│   ├── list-articles.ts             ← server-only
│   ├── get-article-by-slug.ts
│   ├── list-categories.ts
│   ├── search-articles.ts           ← FTS
│   ├── semantic-search.ts           ← pgvector
│   └── list-doc-pages.ts            ← Lê MDX do filesystem
├── components/
│   ├── article-card.tsx
│   ├── article-list.tsx
│   ├── article-viewer.tsx           ← Renderiza HTML do Tiptap + componentes embutidos
│   ├── article-editor.tsx           ← Editor Tiptap + toolbar + IA panel
│   ├── category-tree.tsx
│   ├── search-bar.tsx               ← Cliente, com debounce
│   ├── kb-chat-widget.tsx           ← Floating chat (RAG)
│   ├── mermaid-diagram.tsx          ← Render lazy de diagramas
│   ├── flow-diagram.tsx             ← React Flow
│   ├── remotion-player.tsx          ← Wrapper do <Player /> com fallback
│   └── doc-renderer.tsx             ← Renderiza MDX com remarks/rehypes
├── services/
│   ├── slug-service.ts              ← Geração e validação de slug
│   ├── markdown-service.ts          ← Sanitização e transform Tiptap ↔ MD ↔ HTML
│   ├── embedding-service.ts         ← Chunking + chamada ao provider de embeddings
│   ├── rag-service.ts               ← Monta contexto para chat
│   └── permission-helpers.ts        ← Pequenos helpers de checagem (sempre via authz)
├── schemas/
│   ├── article.ts                   ← Zod: CreateArticleInput, UpdateArticleInput
│   ├── category.ts
│   └── search.ts
├── types/
│   └── index.ts                     ← Tipos derivados de Database
└── index.ts                         ← Barrel — única API pública
```

### Composições Remotion (fora do módulo)

```
src/remotion/
├── Root.tsx                         ← registra todas as composições
├── compositions/
│   ├── stock-movement-flow.tsx      ← Anima entrada/saída de estoque
│   ├── auth-flow.tsx                ← Anima login/registro/RBAC
│   ├── permission-cascade.tsx       ← Mostra como RLS + has_permission decidem acesso
│   └── module-tour.tsx              ← Tour pelo dashboard
├── primitives/                      ← Componentes Remotion reutilizáveis (Card, Pill, ArrowFlow…)
└── tokens.ts                        ← Cores/spacing alinhados ao Tailwind
```

> A pasta `src/remotion/` fica fora do `modules/` porque é consumida tanto pelo player no front quanto pelo bin de render no servidor. O `remotion-player.tsx` (no módulo) referencia `src/remotion` como dependência, igual a Storybook referencia componentes.

---

## 5. Schema do Supabase

Migrations aplicadas em produção:

| Arquivo                             | Conteúdo                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `20260425000019_knowledge_base.sql` | Tabelas `kb_categories`, `kb_articles`, `kb_article_revisions`, `kb_article_chunks`, `kb_videos` + trigger de revisão |
| `20260425000020_kb_rls.sql`         | RLS em todas as 5 tabelas KB                                                                                          |
| `20260425000021_kb_permissions.sql` | Módulo `knowledge-base`, 5 permissões, atribuição automática a `owner`/`manager`/`operator`                           |

Schema das tabelas (migração real `20260425000019_knowledge_base.sql`):

```sql
-- ============================================================
-- 18 — KNOWLEDGE BASE
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

-- 2) Artigos (conteúdo Tiptap salvo como JSON + markdown derivado)
create table public.kb_articles (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  category_id   uuid references public.kb_categories(id) on delete set null,
  slug          text not null,
  title         text not null,
  summary       text,
  content_json  jsonb not null,              -- estado nativo do Tiptap
  content_md    text  not null,              -- markdown gerado (para FTS e diff)
  status        text  not null check (status in ('draft','published','archived')) default 'draft',
  audience      text  not null check (audience in ('user','dev','both')) default 'user',
  related_module text,                       -- ex.: 'inventory'
  related_table  text,                       -- ex.: 'stock_movements' (link cruzado para doc técnica)
  video_id      uuid references public.kb_videos(id) on delete set null,
  search_vector tsvector
    generated always as (
      setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('portuguese', coalesce(summary, '')), 'B') ||
      setweight(to_tsvector('portuguese', coalesce(content_md, '')), 'C')
    ) stored,
  created_by    uuid references auth.users(id),
  updated_by    uuid references auth.users(id),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (company_id, slug)
);
create index kb_articles_search_idx on public.kb_articles using gin (search_vector);
create index kb_articles_company_status_idx on public.kb_articles (company_id, status);

-- 3) Histórico de revisões (snapshot a cada save)
create table public.kb_article_revisions (
  id            uuid primary key default gen_random_uuid(),
  article_id    uuid not null references public.kb_articles(id) on delete cascade,
  content_json  jsonb not null,
  content_md    text  not null,
  edited_by     uuid references auth.users(id),
  edited_at     timestamptz not null default now()
);

-- 4) Embeddings para busca semântica e RAG
create table public.kb_article_chunks (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid not null references public.kb_articles(id) on delete cascade,
  company_id  uuid not null references public.companies(id) on delete cascade,
  chunk_index int  not null,
  content     text not null,
  embedding   vector(1536) not null,         -- ajustar dim conforme provider
  created_at  timestamptz not null default now(),
  unique (article_id, chunk_index)
);
create index kb_chunks_embedding_idx
  on public.kb_article_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 5) Vídeos Remotion (registro + URL no Storage)
create table public.kb_videos (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  composition   text not null,               -- nome da composição em src/remotion
  title         text not null,
  description   text,
  status        text not null check (status in ('queued','rendering','ready','failed')) default 'queued',
  storage_path  text,                        -- ex.: kb-videos/<id>.mp4
  duration_s    numeric,
  thumbnail_path text,
  input_props   jsonb,                       -- props passadas pra composição
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 6) Trigger: ao salvar artigo, copia snapshot pra revisões e zera embeddings
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
end$$;

create trigger trg_kb_after_article_update
before update on public.kb_articles
for each row execute function public.kb_after_article_update();
```

### RLS (`20260425000020_kb_rls.sql`)

Padrão idêntico ao `20260423000016_movements_rls.sql`:

```sql
alter table public.kb_categories       enable row level security;
alter table public.kb_articles         enable row level security;
alter table public.kb_article_revisions enable row level security;
alter table public.kb_article_chunks    enable row level security;
alter table public.kb_videos            enable row level security;

-- LEITURA
create policy "kb_articles_select"
  on public.kb_articles for select
  using (
    company_id in (select user_company_ids())
    and (status = 'published' or has_permission(company_id, 'kb:article:write'))
  );

-- ESCRITA
create policy "kb_articles_insert"
  on public.kb_articles for insert
  with check (has_permission(company_id, 'kb:article:write'));

create policy "kb_articles_update"
  on public.kb_articles for update
  using (has_permission(company_id, 'kb:article:write'))
  with check (
    company_id = (select company_id from public.kb_articles where id = kb_articles.id)
    -- regra extra: só quem tem 'kb:article:publish' pode mudar status para 'published'
  );

-- (idem para revisions/chunks/videos/categories — sempre filtrando por company_id e perms)
```

As 5 permissões e a atribuição por role ficam em `20260425000021_kb_permissions.sql` (não no seed original).

---

## 6. Como o Remotion entra (3 modalidades)

Você marcou as três. Cada uma resolve um caso diferente; combinadas dão a experiência completa.

### 6.1 Vídeos pré-renderizados (assets prontos no Storage)

**Quando usar:** explicações longas, onboarding, conteúdo que muda raramente. Render pesado uma vez, servido como MP4 leve.

**Como:**

1. Composição em `src/remotion/compositions/auth-flow.tsx` (componente React).
2. Server Action `triggerVideoRenderAction` insere linha em `kb_videos` com `status='queued'`.
3. Job (Edge Function do Supabase ou rota Next + `@remotion/renderer`) lê fila, chama `renderMedia`, sobe MP4 para `Supabase Storage`, atualiza `status='ready'`, `storage_path` e `duration_s`.
4. UI mostra `<video src={signedUrl} controls />`.

> **Trade-off:** render pesa CPU. Se hospedagem é Vercel, melhor usar **Lambda render** (`@remotion/lambda`) ou um worker dedicado fora da serverless. Documentar em ADR.

### 6.2 Player Remotion embutido (interativo, sem MP4)

**Quando usar:** dicas curtas dentro de um artigo ("clique aqui para ver a animação"), sem custo de render, controles totais (play/pause/scrub).

**Como:**

```tsx
// components/remotion-player.tsx
"use client";
import { Player } from "@remotion/player";
import { StockMovementFlow } from "@/remotion/compositions/stock-movement-flow";

export function StockMovementPlayer({ inputProps }) {
  return (
    <Player
      component={StockMovementFlow}
      durationInFrames={180}
      compositionWidth={1280}
      compositionHeight={720}
      fps={30}
      inputProps={inputProps}
      controls
      style={{ width: "100%", borderRadius: "0.5rem" }}
    />
  );
}
```

Esse componente é exposto pelo barrel e fica disponível em **artigos do Tiptap** via uma extensão custom `RemotionEmbed` que armazena `{ composition, props }` no JSON e, na renderização, monta o `<RemotionPlayer />` correspondente.

### 6.3 Animações com dados reais (storytelling do banco)

**Quando usar:** "mostrar o último movimento de estoque registrado" como animação, ou onboarding personalizado ("você cadastrou 12 produtos").

**Como:**

1. Server Component busca dados (`getProduct`, `listMovements` do módulo inventory — via barrel, claro).
2. Passa via `inputProps` para a composição:

   ```tsx
   const movement = await getMovement(id);
   return <StockMovementPlayer inputProps={{ movement, product }} />;
   ```

3. A composição usa `useCurrentFrame()` e `interpolate()` para animar o número saindo/entrando.
4. Bonus: se o usuário quiser baixar como MP4, o mesmo `inputProps` é serializado e mandado pra fila de render (modalidade 1).

> **Importante:** dados reais nunca são embutidos em MP4 público. Render só roda autenticado e o Storage usa **signed URLs** com TTL curto.

---

## 7. Camada de IA (assistente híbrido)

Você pediu "Híbrido + IA". A IA atua em três pontos, todos opcionais e gateados por `kb:ai:use`:

### 7.1 Busca semântica (SearchBar e `/manual/busca`)

- Indexação: ao publicar um artigo, `embedding-service.chunkAndEmbed(article)` divide o `content_md` em chunks (~500 tokens), gera embeddings via Vercel AI SDK (`embed`), grava em `kb_article_chunks`.
- Query: usuário digita → server action `semanticSearch(q)` faz embedding da query, roda `select ... order by embedding <=> :q_emb limit 10`, mistura resultados com FTS (rank-fusion simples) e devolve top 10.

### 7.2 RAG Chat (widget flutuante "Pergunte ao manual")

- Componente `kb-chat-widget.tsx` (cliente) usa `useChat` do `ai/react`.
- Endpoint `app/api/kb/chat/route.ts` recebe a pergunta, chama `rag-service.buildContext(question, companyId)` (faz semantic search nos chunks **filtrando por company_id via RLS**), monta prompt:

  ```
  Você é o assistente do ERP da empresa X. Responda APENAS com base nos
  trechos abaixo. Se não souber, diga que não encontrou no manual e
  sugira 2 buscas relacionadas. Sempre cite o título do artigo entre [].
  ```

- Stream de volta com `streamText`. UI mostra com citações clicáveis para os artigos-fonte.

### 7.3 Copiloto no editor (geração assistida)

Dentro do editor Tiptap, três ações:

| Ação                                | Server Action                                                 | Comportamento                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **"Gerar rascunho"**                | `aiDraftArticle({ title, audience, related_module })`         | Lê schema/migrations relacionadas (via filesystem do projeto, em build-time fica num índice estático), gera 3 seções base. |
| **"Reescrever para usuário final"** | `aiSuggestEdit({ articleId, mode: 'simplify' })`              | Faz pass de simplificação no trecho selecionado.                                                                           |
| **"Documentar tabela"**             | `aiDraftArticle({ kind: 'table', table: 'stock_movements' })` | Lê definição da tabela + policies RLS + triggers e gera documentação técnica em MDX-pronto.                                |

> **Provider:** começar com `@ai-sdk/anthropic` (Claude) por afinidade. Trocar é reescrever 1 import. Chave em `src/core/config/env.ts` com Zod (`ANTHROPIC_API_KEY`).

---

## 8. Conteúdo "código" (MDX para devs)

Para a Documentação Técnica (`/docs/...`), preferimos MDX no repositório:

```
src/content/docs/
├── arquitetura/
│   ├── visao-geral.mdx
│   ├── multitenant.mdx
│   └── rls-rbac.mdx
├── modulos/
│   ├── inventory.mdx
│   ├── auth.mdx
│   └── knowledge-base.mdx
├── tabelas/
│   ├── products.mdx
│   ├── stock_movements.mdx
│   └── kb_articles.mdx
└── adrs/
    ├── 0001-modular-boundaries.mdx
    └── 0002-remotion-rendering.mdx
```

Cada `.mdx` tem frontmatter validado por Zod (`title`, `audience`, `related_module`, `tags`). A página renderiza com:

- `next-mdx-remote/rsc` (avoid client bundle).
- Plugins: `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `rehype-pretty-code`.
- Componentes injetados: `<Mermaid />`, `<RemotionPlayer />`, `<TableSpec />`, `<RlsBlock />`, `<Callout />`.

A vantagem dupla: o **mesmo conteúdo MDX entra na busca semântica**, porque um job no build (`scripts/index-docs.ts`) percorre os arquivos, faz chunking e popula `kb_article_chunks` com `article_id = null` + `source = 'mdx'` (campo extra).

---

## 9. Fluxos principais

### 9.1 Admin cria/edita artigo (UI)

```
Admin → /manual/editor/[id]
   → ArticleEditor (Tiptap)
   → Botão "Salvar"
   → updateArticleAction(formData)        # 'use server'
       → schema.safeParse                   # zod
       → requirePermission('kb:article:write')
       → supabase.from('kb_articles').update({ content_json, content_md })
       → trigger trg_kb_after_article_update grava revisão
       → revalidatePath(`/${slug}/manual/artigo/${slug}`)
   → Toast (sonner): "Artigo salvo"
```

### 9.2 Dev escreve doc técnica

```
Dev → cria src/content/docs/tabelas/nova-tabela.mdx
   → PR → merge → CI roda `scripts/index-docs.ts` no postbuild
   → Embeddings novos vão pra kb_article_chunks
   → /docs/tabelas/nova-tabela é estático (build-time)
```

### 9.3 Usuário busca

```
Usuário digita "como dar baixa em estoque"
   → SearchBar (cliente) → POST /api/kb/search
   → Mistura FTS + semantic search
   → Lista de hits com snippet destacado
   → Clica → /manual/artigo/[slug]
```

### 9.4 Render de vídeo personalizado

```
Usuário (perm kb:article:write) clica "Gerar vídeo deste fluxo"
   → triggerVideoRenderAction({ composition, inputProps })
   → insert kb_videos status='queued'
   → Worker (Supabase Edge Function ou rota /api/kb/remotion/render)
       → bundle Remotion (cache de bundle entre runs)
       → renderMedia → MP4 temp
       → upload pro bucket knowledge-base/videos
       → update kb_videos status='ready'
   → UI faz polling (ou Realtime) → exibe player
```

---

## 10. Plano faseado

| Fase                                                                                                           | Entrega                                                                                                                                                                                                                                                            | Critério de pronto                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F0 — Fundação** ✅ **CONCLUÍDO** (PR #18 · 2026-04-26)                                                       | Migrations 19, 20 e 21, 5 perms semeadas, item no `MODULES_MENU`, módulo `knowledge-base/` com barrel vazio, rota `/manual` placeholder.                                                                                                                           | `db:types` regenerado, `lint` e `typecheck` limpos, rota carrega gated por `requirePermission`. CI: `supabase start --ignore-health-check` (edge runtime não usado). |
| **F1 — Manual editável (CRUD)** ✅ **CONCLUÍDO** (branch `feat/knowledge-base-f1` · 2026-04-29)                | Tiptap instalado, actions CRUD completas, queries, schemas, slug-service, componentes (editor, viewer, list, category-tree, publish-form), rotas `/manual` completas.                                                                                              | Admin cria artigo, publica; usuário sem `kb:article:write` vê só publicados. Build limpo, hydration fix aplicado.                                                    |
| **F2 — Doc técnica MDX** 🔍 **EM REVISÃO** ([PR #23](https://github.com/triade-devs/erp/pull/23) · 2026-04-30) | Pipeline `next-mdx-remote/rsc`, layout `/docs`, plugins (gfm, slug, pretty-code), componentes `<Mermaid />`, `<TableSpec />`, `<Callout />`, `<RlsBlock />`, `<DocRenderer />`. Item "Documentação" no `MODULES_MENU` gated por `kb:doc:read`. 3 páginas MDX seed. | 3 páginas MDX renderizam, build limpo, typecheck limpo.                                                                                                              |
| **F3 — Remotion** 🔍 **EM REVISÃO** ([PR #24](https://github.com/triade-devs/erp/pull/24) · 2026-04-30)        | `src/remotion/` com tokens, primitivos (`Card`, `Pill`, `ArrowFlow`) e 2 composições (`StockMovementFlow`, `AuthFlow`). `<RemotionPlayer />` client component no barrel. Extensão Tiptap `RemotionEmbedExtension`. `transpilePackages` configurado.                | Build limpo, typecheck limpo. Player toca props mockadas.                                                                                                            |
| **F4 — Busca + IA**                                                                                            | FTS, pgvector, `embedding-service`, `/api/kb/search`, widget de chat RAG, copiloto no editor.                                                                                                                                                                      | Busca textual e semântica retornam resultados pertinentes em <500ms p95, chat cita fontes, copiloto gera rascunho coerente.                                          |
| **F5 — Render de vídeos**                                                                                      | Worker de render (decisão: Edge Function vs Lambda Remotion), upload pro Storage, polling/Realtime na UI.                                                                                                                                                          | Job dispara, MP4 chega ao bucket, link assinado abre, falhas marcam `status='failed'` com `error_message`.                                                           |

> Cada fase entra como PR independente, com migration própria quando aplicável, seguindo o ritmo do `docs/PLAN.md`.

---

## 11. Dependências a instalar

```bash
# Editor + MDX
npm i @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-image \
      tiptap-markdown next-mdx-remote remark-gfm rehype-slug rehype-autolink-headings \
      rehype-pretty-code shiki

# Diagramas
npm i mermaid @xyflow/react

# Remotion
npm i remotion @remotion/player @remotion/renderer @remotion/bundler
# (opcional render serverless) @remotion/lambda

# IA
npm i ai @ai-sdk/anthropic
# (opcional) @ai-sdk/openai

# Busca / utils
npm i fuse.js  # fallback client-side de busca para casos offline
```

E o seguinte schema env (em `src/core/config/env.ts`):

```ts
ANTHROPIC_API_KEY: z.string().min(1),
KB_EMBEDDINGS_PROVIDER: z.enum(["anthropic","openai"]).default("anthropic"),
KB_VIDEO_RENDER_MODE: z.enum(["inline","lambda","worker"]).default("inline"),
```

---

## 12. Riscos e trade-offs

| Risco                                              | Mitigação                                                                                                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render Remotion pesado em Vercel serverless        | Começar com player embutido (sem render). Render só na F5, e nessa fase decidir entre Lambda Remotion ou um worker dedicado (Render.com/Railway). Documentar em ADR.              |
| pgvector em Supabase free tier tem limite de RAM   | Usar índice `ivfflat` com `lists` adequado; manter chunks pequenos; só indexar artigos publicados.                                                                                |
| Conteúdo desatualizado (drift entre código e docs) | F2 inclui um lint custom em CI: para cada `kb_articles.related_table`, checar se a tabela ainda existe nas migrations. Falha se órfão.                                            |
| Custo de IA descontrolado                          | Permissão `kb:ai:use` por role. Rate-limit por usuário/empresa em `app/api/kb/chat/route.ts`. Logging de tokens em `audit_log`.                                                   |
| Tiptap JSON virar formato refém                    | `content_md` é fonte secundária e é o que vai pra busca/RAG. Sempre mantemos os dois.                                                                                             |
| RLS na busca semântica                             | A query `semantic_search` roda **com o cliente do usuário** (não service role), então o `vector <=>` já é pré-filtrado pela policy `kb_chunks_select`. Garantir testes para isso. |

---

## 13. Definition of Done (módulo)

### F0 — concluído ✅

- [x] Migrations 19, 20 e 21 aplicadas em produção; `db:types` regenerado com tabelas KB.
- [x] 5 permissões semeadas e atribuídas: `owner` recebe todas; `manager` todas; `operator` `read` + `ai:use`. Roles customizadas (ex.: `docs`) precisam de atribuição manual via Configurações → Roles.
- [x] `src/modules/knowledge-base/index.ts` exporta barrel vazio; `types/index.ts` com tipos derivados de `Database`. ESLint limpo.
- [x] Item `"Manual"` em `MODULES_MENU` com `requiresPermission: "kb:article:read"` e `icon: "book-open"`.
- [x] Layout do dashboard não foi tocado.
- [x] Página `/manual` gated por `requirePermission(company.id, "kb:article:read")` com mensagem de acesso negado em pt-BR.
- [x] Strings e comentários em pt-BR.
- [x] CI corrigido: `supabase start --ignore-health-check` (edge runtime retornava 502 no GitHub Actions).

### F1 — concluído ✅

- [x] Tiptap instalado: `@tiptap/react`, `@tiptap/starter-kit`, `tiptap-markdown`.
- [x] Server Actions com `ActionResult`: `createArticleAction`, `updateArticleAction`, `deleteArticleAction`, `publishArticleAction`.
- [x] Queries server-only: `listArticles`, `getArticleBySlug`, `listCategories`.
- [x] Schemas Zod: `createArticleSchema`, `updateArticleSchema`, `categorySchema`.
- [x] Service: `slug-service.ts` (geração e unicidade de slug).
- [x] Componentes: `ArticleEditor` (Tiptap), `ArticleViewer`, `ArticleList`, `CategoryTree`, `PublishForm`.
- [x] Rotas: `/manual`, `/manual/artigo/[slug]`, `/manual/editor`, `/manual/editor/[id]`.
- [x] Barrel `index.ts` exporta tudo acima.
- [x] Fix hydration: `immediatelyRender: false` no `useEditor`.
- [x] Sem `dangerouslySetInnerHTML` — viewer renderiza `content_md` como texto.
- [x] Checagem de permissão sem duplicação na rota de artigo.

- [x] `upsertCategoryAction` — cria e edita categorias, slug auto-gerado do título, exportado no barrel.
- [x] Filtro por categoria via `?category=slug` no `/manual` — rota `categoria/[slug]` não necessária (CategoryTree já faz link com query param).

### F2 — em revisão 🔍 ([PR #23](https://github.com/triade-devs/erp/pull/23))

- [x] Pacotes instalados: `next-mdx-remote`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `rehype-pretty-code`, `shiki`, `gray-matter`, `mermaid`.
- [x] Schema Zod `docPageFrontmatterSchema` (`title`, `audience`, `related_module`, `tags`) em `schemas/doc-page.ts`.
- [x] Query `listDocPages` — lê MDX do filesystem, valida frontmatter.
- [x] Componentes: `Callout`, `TableSpec`, `RlsBlock`, `MermaidDiagram` (client, lazy), `DocRenderer` (RSC, next-mdx-remote/rsc).
- [x] Rotas: `/docs` (sumário), `/docs/arquitetura/[...slug]`, `/docs/modulos/[modulo]`, `/docs/tabelas/[tabela]` — todas via layout gated por `kb:doc:read`.
- [x] Item "Documentação" no `MODULES_MENU` com `requiresPermission: "kb:doc:read"`.
- [x] 3 páginas seed: `arquitetura/visao-geral.mdx`, `modulos/inventory.mdx`, `tabelas/products.mdx`.

### F3 — em revisão 🔍 ([PR #24](https://github.com/triade-devs/erp/pull/24))

- [x] Pacotes instalados: `remotion`, `@remotion/player`. `transpilePackages` em `next.config.mjs`.
- [x] `src/remotion/tokens.ts` — paleta alinhada ao Tailwind/shadcn.
- [x] `src/remotion/primitives/` — `Card`, `Pill`, `ArrowFlow` com animações via `useCurrentFrame`/`interpolate`.
- [x] `src/remotion/Root.tsx` — registra `StockMovementFlow` e `AuthFlow`.
- [x] `src/remotion/compositions/stock-movement-flow.tsx` — anima entrada/saída de estoque (180 frames, 30fps).
- [x] `src/remotion/compositions/auth-flow.tsx` — anima login → sessão → role → permissão (180 frames, 30fps).
- [x] `RemotionPlayer` — wrapper `"use client"` do `<Player />`, exportado no barrel.
- [x] `RemotionEmbedExtension` — extensão Tiptap `atom` que armazena `{ composition, props }` como JSON no editor.

### Pendente (F4+)

- [ ] `busca/page.tsx` (FTS + semântica — F4).
- [ ] README atualizado com seção "Base de Conhecimento".
- [ ] RLS validada com 2 empresas distintas (teste formal).

---

## 14. Próximos passos

**F3 concluído.** Próxima fase: **F4 — Busca + IA**.

Escopo de F4:

- FTS via `search_vector` (já gerado como coluna `tsvector stored` em `kb_articles`)
- pgvector: `embedding-service.ts` — chunking + embed via Vercel AI SDK, grava em `kb_article_chunks`
- Rota `POST /api/kb/search` — mistura FTS + semantic search (rank-fusion)
- `busca/page.tsx` com `SearchBar` debounced
- Widget `kb-chat-widget.tsx` — `useChat` do `ai/react`, endpoint `POST /api/kb/chat` com RAG
- Copiloto no editor: `aiDraftArticle`, `aiSuggestEdit` (Server Actions gated por `kb:ai:use`)
- Env vars a adicionar em `src/core/config/env.ts`: `ANTHROPIC_API_KEY`, `KB_EMBEDDINGS_PROVIDER`
- Critério: busca textual e semântica retornam resultados em <500ms p95; chat cita fontes; copiloto gera rascunho coerente.
