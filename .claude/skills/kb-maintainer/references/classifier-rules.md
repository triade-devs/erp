# Regras do classificador de drift

> Este arquivo é a referência humana das regras codificadas em `scripts/classify.ts`. Manter sincronia entre os dois é responsabilidade do PR que alterar qualquer um.

## Princípio

Doc errada é pior que doc desatualizada. Na dúvida, a severidade sobe (AUTO → DRAFT → BLOCK).

## Tabela completa

| Detector                              | Quando dispara                                                                                              | Severidade | Razão da escolha                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------- |
| `embeddings-stale`                    | Hash de `kb_articles.content_md` mudou e seus chunks em `kb_article_chunks` ainda referenciam o hash antigo | **AUTO**   | Operação puramente mecânica, idempotente, reversível ao reindexar.                 |
| `module-exports-cell`                 | Lista de exports do barrel mudou e a tabela "Exports" no MDX do módulo está desatualizada                   | **AUTO**   | Reescrita celular, escopo cirúrgico (só uma tabela de uma seção).                  |
| `permissions-catalog-cell`            | Lista do seed de permissions mudou e a tabela do artigo central de RBAC está desatualizada                  | **AUTO**   | Mesma justificativa do anterior.                                                   |
| `remotion-rerender`                   | Hash do componente em `src/remotion/compositions/` mudou e há `kb_videos` apontando                         | **AUTO**   | Re-enfileira render; vídeo antigo continua válido até novo ficar pronto.           |
| `mdx-frontmatter-fix`                 | MDX sem `title` ou com `audience` fora de `{user, dev, both}`                                               | **AUTO**   | Correção mecânica do frontmatter para defaults seguros.                            |
| `migration-without-article`           | Tabela criada (não-`kb_*`) sem MDX em `tabelas/` nem `kb_articles.related_table` correspondente             | **DRAFT**  | Estrutura nova exige redação humana; rascunho IA acelera mas não decide.           |
| `module-without-article`              | Pasta nova em `src/modules/` sem MDX em `modulos/`                                                          | **DRAFT**  | Idem.                                                                              |
| `permission-without-article`          | Permission no seed sem menção em nenhum artigo                                                              | **DRAFT**  | Idem.                                                                              |
| `rls-policy-changed`                  | Policies de tabela já documentada divergem do hash anterior                                                 | **DRAFT**  | Mudança semântica de regras de acesso — risco de doc falsa se aplicar sem revisão. |
| `orphan-related-table`                | Artigo (`kb_articles` ou MDX) com `related_table` apontando para tabela inexistente no schema atual         | **BLOCK**  | Link morto em produção é pior que doc faltando.                                    |
| `dropped-permission-still-documented` | Permission removida do seed mas mencionada em artigo `published`                                            | **BLOCK**  | Usuário lê doc errada, abre ticket, fica frustrado.                                |
| `renamed-trigger-stale-doc`           | Trigger renomeada via DROP+CREATE e doc menciona o nome antigo                                              | **BLOCK**  | Mesma razão.                                                                       |
| `kb-table-schema-changed`             | Migration mexeu em qualquer `kb_*` mas `references/kb-schema.md` não foi atualizado no mesmo PR             | **BLOCK**  | A skill precisa documentar a si mesma.                                             |

## Override manual

Comentar `/kb-maintainer ignore <regra>` em PR adiciona label `kb-skip-<regra>`. O detector pula o item nesse PR específico. Override fica auditado em `audit_log` (M5+).

## Quando criar uma nova regra

1. Pergunte: a divergência sempre tem o mesmo desfecho (corrigir mecanicamente, redigir, ou bloquear)? Se sim, novo detector. Se não, talvez sejam dois.
2. Se a regra envolve julgamento subjetivo do conteúdo, **não** crie detector — deixe humano. A skill é para drift estrutural.
3. Atualize esta tabela e `scripts/classify.ts` no mesmo commit.
