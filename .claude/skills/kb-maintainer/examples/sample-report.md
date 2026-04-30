## kb-maintainer · Resumo de drift

| 🤖 AUTO | 📝 DRAFT | 🛑 BLOCK | Total |
| ------: | -------: | -------: | ----: |
|       2 |        1 |        0 |     3 |

### 📝 Rascunho gerado — revisar

- **`migration-without-article`** — Tabela `audit_log` não tem artigo correspondente.
  - alvo: `src/content/docs/tabelas/audit_log.mdx`
  - fonte: `supabase/migrations/20260420000005_tenancy_core.sql`

### 🤖 Aplicado automaticamente

- **`module-exports-cell`** — Lista de exports do módulo `inventory` reescrita.
  - alvo: `src/content/docs/modulos/inventory.mdx`
  - fonte: `src/modules/inventory/index.ts`
- **`embeddings-stale`** — 3 chunks regenerados após edição de artigo.
  - alvo: `kb_article_chunks` para `como-dar-baixa-em-estoque`
  - fonte: `kb_articles:como-dar-baixa-em-estoque`

> Ajuste o relatório executando `npx tsx .claude/skills/kb-maintainer/scripts/detect-drift.ts --dry-run` localmente.
