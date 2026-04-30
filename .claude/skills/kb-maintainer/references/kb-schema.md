# Schema das tabelas `kb_*`

> Este arquivo é fonte para o detector `kb-table-schema-changed` (BLOCK). Toda mudança em migrations que tocam `kb_*` deve atualizar este arquivo no mesmo PR — caso contrário, o CI bloqueia o merge.

## Tabelas

### `kb_categories`

Árvore simples de categorias. `parent_id` opcional.

| Coluna     | Tipo             | Descrição               |
| ---------- | ---------------- | ----------------------- |
| id         | uuid PK          | gen_random_uuid()       |
| company_id | uuid FK          | empresa (RLS)           |
| parent_id  | uuid FK nullable | nó-pai                  |
| slug       | text             | único por empresa       |
| title      | text             | rótulo                  |
| audience   | text             | `user` / `dev` / `both` |
| position   | int              | ordenação               |

### `kb_articles`

Conteúdo do manual (Tiptap JSON + Markdown derivado).

| Coluna                               | Tipo             | Descrição                               |
| ------------------------------------ | ---------------- | --------------------------------------- |
| id                                   | uuid PK          |                                         |
| company_id                           | uuid FK          | RLS                                     |
| category_id                          | uuid FK nullable |                                         |
| slug                                 | text             | único por empresa                       |
| title                                | text             |                                         |
| summary                              | text             |                                         |
| content_json                         | jsonb            | estado nativo do Tiptap                 |
| content_md                           | text             | markdown derivado, fonte para FTS e RAG |
| status                               | text             | `draft` / `published` / `archived`      |
| audience                             | text             | `user` / `dev` / `both`                 |
| related_module                       | text             | usado pela skill                        |
| related_table                        | text             | usado pela skill — quebra se órfão      |
| video_id                             | uuid FK          | aponta para `kb_videos`                 |
| search_vector                        | tsvector         | gerado, FTS                             |
| created_by, updated_by               | uuid             | auth.users                              |
| published_at, created_at, updated_at | timestamptz      |                                         |

### `kb_article_revisions`

Snapshot a cada update de `kb_articles`.

### `kb_article_chunks`

Chunks com embeddings para RAG. Dim 1536 (ajustar conforme provider).

### `kb_videos`

Registro dos vídeos Remotion (renderizados ou enfileirados).

| Coluna       | Tipo    | Descrição                                   |
| ------------ | ------- | ------------------------------------------- |
| id           | uuid PK |                                             |
| company_id   | uuid FK | RLS                                         |
| composition  | text    | nome em `src/remotion/compositions/`        |
| status       | text    | `queued` / `rendering` / `ready` / `failed` |
| storage_path | text    | bucket `knowledge-base/videos/<id>.mp4`     |
| input_props  | jsonb   | props passadas pra composição               |

## Triggers

- `trg_kb_after_article_update` — em update de `kb_articles`: gera linha em `kb_article_revisions` e zera `kb_article_chunks` (forçar reindex).

## RLS

Veja `supabase/migrations/...19_kb_rls.sql` (a ser criada na fase F0 do plano KB). Policies seguem padrão de `..._16_movements_rls.sql`.

---

> ⚠️ Quando este arquivo ficar fora de sincronia com migrations `kb_*`, o detector `kb-table-schema-changed` falha o CI.
