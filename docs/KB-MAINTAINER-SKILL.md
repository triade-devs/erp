# Skill `kb-maintainer` — Manutenção Orgânica da Base de Conhecimento

> **Status:** Proposta (rev. 1) · 2026-04-25
> **Companion de:** `KNOWLEDGE-BASE-ARCHITECTURE.md`
> **Decisões fixadas pelo usuário:**
>
> - Localização: `.claude/skills/kb-maintainer/` (versionada no repo)
> - Gatilho: GitHub Action em PRs que tocam `supabase/migrations/**` ou `src/modules/**`
> - Autonomia: aplicar automaticamente fixes de baixo risco; o resto vira PR de revisão
> - Escopo: cobertura completa já na v1

---

## 1. Princípio

Documentação envelhece sozinha. A skill existe para encurtar o ciclo entre **mudança no código** e **atualização da doc** ao mínimo possível, sem que humano precise lembrar. O lema é: _toda mudança de código que afeta semântica do sistema deve nascer com sua atualização de doc no mesmo PR._

A automação total é tentadora mas perigosa: doc errada é pior que doc desatualizada. Por isso a skill opera com **três níveis rígidos** de severidade. Só o nível `AUTO` toca arquivos sem revisão; os outros dois geram artefatos para humano aprovar (`DRAFT`) ou simplesmente quebram o CI até alguém resolver (`BLOCK`).

---

## 2. Classificador de drift (a regra mais importante)

| Severidade | O que é                                                                        | O que a skill faz                                                                                  |
| ---------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| **AUTO**   | Mudança mecânica, reversível, sem ambiguidade semântica.                       | Aplica direto na PR branch, sem perguntar.                                                         |
| **DRAFT**  | Mudança estrutural que precisa de redação humana, mas pode ser pré-rascunhada. | Gera rascunho (artigo MDX ou linha em `kb_articles` com `status='draft'`), commita e comenta o PR. |
| **BLOCK**  | Mudança destrutiva ou semântica que invalida doc existente.                    | Falha o check do CI com relatório. Humano precisa atualizar antes do merge.                        |

### Regras concretas (v1)

#### Detectores → severidade

| Detector                              | Gatilho                                                                                    | Severidade                                                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `embeddings-stale`                    | Artigo `published` cujo `content_md` mudou e não tem chunks atualizados                    | **AUTO** — regenera embeddings em `kb_article_chunks`                                                            |
| `module-exports-cell`                 | Lista "Exports" no artigo de doc técnica do módulo está fora de sincronia com o `index.ts` | **AUTO** — reescreve só essa célula via patch                                                                    |
| `permissions-catalog-cell`            | Tabela "Permissões disponíveis" no artigo central de RBAC desatualizada vs seed            | **AUTO** — reescreve só a tabela                                                                                 |
| `remotion-rerender`                   | Composição em `src/remotion/` mudou (hash) e há `kb_videos.composition` apontando para ela | **AUTO** — re-enfileira render (insert em `kb_videos` `status='queued'`)                                         |
| `mdx-frontmatter-fix`                 | MDX sem `title` ou com `audience` inválido                                                 | **AUTO** — preenche valor padrão e abre warning                                                                  |
| `migration-without-article`           | Migration nova cria/altera tabela e não há artigo com `related_table` correspondente       | **DRAFT** — gera MDX em `src/content/docs/tabelas/<tabela>.mdx` (modo dev) ou linha em `kb_articles` (modo user) |
| `module-without-article`              | Novo módulo em `src/modules/` sem artigo em `src/content/docs/modulos/`                    | **DRAFT** — gera MDX inicial baseado no barrel                                                                   |
| `permission-without-article`          | Permissão nova no seed sem menção em artigo                                                | **DRAFT** — adiciona linha rascunho ao artigo central de RBAC                                                    |
| `rls-policy-changed`                  | Policy nova em tabela já documentada                                                       | **DRAFT** — anexa seção "RLS" atualizada ao artigo da tabela                                                     |
| `orphan-related-table`                | Artigo com `related_table` apontando pra tabela que não existe mais                        | **BLOCK**                                                                                                        |
| `dropped-permission-still-documented` | Permissão removida do seed mas ainda mencionada em artigo publicado                        | **BLOCK**                                                                                                        |
| `renamed-trigger-stale-doc`           | Trigger SQL renomeada e doc menciona o nome antigo                                         | **BLOCK**                                                                                                        |
| `kb-table-schema-changed`             | Migration mexeu em `kb_*` mas a doc do próprio kb-maintainer não foi atualizada            | **BLOCK** (auto-doc do próprio sistema)                                                                          |

> **Por que `BLOCK` quebra o CI:** se uma referência morre, qualquer link em produção vira 404. É melhor segurar o merge por 5 minutos do que vazar inconsistência para os usuários.

---

## 3. Arquitetura

```
.claude/skills/kb-maintainer/
├── SKILL.md                       # Methodology — como Claude usa esta skill
├── scripts/
│   ├── detect-drift.ts            # Entrada principal — orquestra todos os detectores
│   ├── apply-auto.ts              # Executa fixes AUTO
│   ├── generate-drafts.ts         # Chama Claude para gerar conteúdo DRAFT
│   ├── classify.ts                # Aplica regras da tabela acima
│   ├── report.ts                  # Renderiza relatório markdown e comentário PR
│   ├── sources/
│   │   ├── migrations.ts          # Parse SQL → tabelas, colunas, policies, triggers, fns
│   │   ├── modules.ts             # Parse barrel ts → exports nomeados
│   │   ├── permissions.ts         # Parse seed → catálogo de permissions
│   │   ├── remotion.ts            # Parse Root.tsx → composições registradas
│   │   └── content-docs.ts        # Parse MDX → frontmatter + body hash
│   ├── targets/
│   │   ├── kb-articles.ts         # Lê estado de kb_articles via service role
│   │   └── mdx-docs.ts            # Lê MDX existentes do filesystem
│   ├── lib/
│   │   ├── manifest.ts            # SHA256 manifest (cache de hashes)
│   │   ├── claude-client.ts       # AI SDK wrapper (Anthropic) p/ geração
│   │   ├── supabase.ts            # Client server-only com SUPABASE_SERVICE_ROLE_KEY
│   │   └── git.ts                 # Utilidades pra commit/branch via gh cli
│   └── types.ts
├── templates/                     # Prompts de geração (passados ao Claude)
│   ├── article-from-migration.md
│   ├── article-from-table.md
│   ├── article-from-module.md
│   ├── article-from-permission.md
│   └── article-from-rls.md
├── references/
│   ├── classifier-rules.md        # Versão extensa das regras da seção 2
│   ├── prompt-engineering.md      # Diretrizes de redação dos rascunhos
│   └── kb-schema.md               # Schema das tabelas kb_* (auto-gerado pela própria skill)
├── examples/
│   └── sample-report.md
└── package.json                   # tsx + dependências locais da skill
```

### Por que tem `package.json` separado

A skill roda em CI sem precisar do `node_modules` do projeto principal carregado para rodar `next`. Mantemos só `tsx`, `@supabase/supabase-js`, `ai`, `@ai-sdk/anthropic`, `gray-matter`, `zod`. CI faz `npm ci` dentro de `.claude/skills/kb-maintainer/`.

---

## 4. Fontes de verdade que ela varre

| Fonte            | Onde mora                                                                                                             | O que extrai                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Migrations       | `supabase/migrations/*.sql`                                                                                           | Tabelas, colunas, types, policies RLS, funções, triggers, sequence renames, drops   |
| Módulos          | `src/modules/*/index.ts`                                                                                              | Lista de exports nomeados (actions, queries, components, services, types)           |
| Permissions      | `supabase/migrations/*seed_core_permissions*.sql` (e qualquer migration posterior que faça `insert into permissions`) | Catálogo `module:resource:action` com descrição                                     |
| Menu             | `src/core/navigation/menu.ts`                                                                                         | Lista de módulos ativos no nav (para detectar módulos órfãos sem nav)               |
| Remotion         | `src/remotion/Root.tsx`                                                                                               | Composições registradas + suas durations e dimensões                                |
| MDX docs         | `src/content/docs/**/*.mdx`                                                                                           | Frontmatter (`title`, `audience`, `related_table`, `related_module`) + hash do body |
| Artigos editados | Tabela `kb_articles` (via service role)                                                                               | Estado da doc operacional                                                           |

---

## 5. Manifest (cache de hashes)

Criar `.kb-maintainer/manifest.json` (gitignored) com:

```json
{
  "version": 1,
  "generated_at": "2026-04-25T12:00:00Z",
  "sources": {
    "migrations/20260420000003_stock_movements.sql": "sha256-abc…",
    "src/modules/inventory/index.ts": "sha256-def…",
    "src/remotion/compositions/stock-movement-flow.tsx": "sha256-ghi…"
  },
  "targets": {
    "kb_articles:tabelas-stock-movements": {
      "hash": "sha256-jkl…",
      "based_on": ["migrations/20260420000003_stock_movements.sql"]
    },
    "src/content/docs/tabelas/stock_movements.mdx": {
      "hash": "sha256-mno…",
      "based_on": ["migrations/20260420000003_stock_movements.sql"]
    }
  }
}
```

Comparação por hash deixa a detecção em **O(arquivos)** e idempotente: rodar a skill 3x seguidas dá o mesmo resultado.

---

## 6. Modos de execução

A skill expõe três comandos via CLI:

```bash
# 1. Modo CI (padrão) — detecta tudo, aplica AUTO, gera DRAFT, falha em BLOCK
tsx scripts/detect-drift.ts --ci

# 2. Modo dev local — só relata, não escreve nada
tsx scripts/detect-drift.ts --dry-run

# 3. Modo "draft only" — útil para humano gerar rascunhos sob demanda
tsx scripts/generate-drafts.ts --target kb_articles --slug tabelas/produtos
```

---

## 7. Fluxo no GitHub Action

`.github/workflows/kb-maintain.yml`:

```yaml
name: KB Maintain

on:
  pull_request:
    types: [opened, synchronize, reopened]
    paths:
      - "supabase/migrations/**"
      - "src/modules/**"
      - "src/remotion/**"
      - "src/content/docs/**"
      - ".claude/skills/kb-maintainer/**"

permissions:
  contents: write # commitar fixes na PR branch
  pull-requests: write # comentar no PR

concurrency:
  group: kb-maintain-${{ github.head_ref }}
  cancel-in-progress: true

jobs:
  maintain:
    runs-on: ubuntu-latest
    if: github.event.pull_request.head.repo.full_name == github.repository # bloqueia forks
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.head_ref }}
          fetch-depth: 0
          token: ${{ secrets.KB_BOT_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          {
            node-version: "20",
            cache: "npm",
            cache-dependency-path: ".claude/skills/kb-maintainer/package-lock.json",
          }

      - name: Install skill deps
        working-directory: .claude/skills/kb-maintainer
        run: npm ci

      - name: Detect drift
        id: detect
        working-directory: .claude/skills/kb-maintainer
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx tsx scripts/detect-drift.ts --ci --report-path report.md --json-out report.json
          echo "blocks=$(jq '.summary.blocks' report.json)" >> $GITHUB_OUTPUT
          echo "auto=$(jq   '.summary.auto'   report.json)" >> $GITHUB_OUTPUT
          echo "drafts=$(jq '.summary.drafts' report.json)" >> $GITHUB_OUTPUT

      - name: Comment report
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          path: .claude/skills/kb-maintainer/report.md
          header: kb-maintainer

      - name: Commit auto fixes & drafts
        if: steps.detect.outputs.blocks == '0'
        run: |
          git config user.name  "kb-maintainer-bot"
          git config user.email "kb-bot@erp.local"
          git add -A
          if ! git diff --staged --quiet; then
            git commit -m "docs(kb): auto-update by kb-maintainer

            auto=${{ steps.detect.outputs.auto }} drafts=${{ steps.detect.outputs.drafts }}"
            git push origin HEAD:${{ github.head_ref }}
          fi

      - name: Fail if blocks
        if: steps.detect.outputs.blocks != '0'
        run: |
          echo "::error::kb-maintainer detectou ${{ steps.detect.outputs.blocks }} drift(s) BLOCK. Resolva antes do merge."
          exit 1
```

### Notas operacionais

- `KB_BOT_TOKEN` é um PAT com escopo `contents:write, pull_requests:write` num bot account — necessário para que o push do CI dispare workflows seguintes.
- `concurrency` cancela runs antigos quando você faz force-push.
- `if: ... full_name == github.repository` evita rodar com secrets em PRs de fork (segurança).
- O comentário usa `sticky-pull-request-comment` para sobrescrever o anterior em vez de empilhar.

---

## 8. Geração de rascunhos com IA

Os templates em `templates/*.md` são prompts no estilo do Claude. Ex.: `article-from-migration.md`:

```
Você é responsável por documentar uma tabela do banco de dados de um ERP
multi-tenant Next.js + Supabase.

Contexto da migration que criou/alterou esta tabela:
<migration>
{{migration_sql}}
</migration>

Migrations posteriores que alteraram esta tabela:
<later_migrations>
{{later_migrations_sql}}
</later_migrations>

Policies RLS atualmente ativas:
<rls>
{{rls_policies}}
</rls>

Triggers e funções relacionadas:
<triggers>
{{triggers}}
</triggers>

Tarefa: gerar um arquivo MDX em PT-BR com o seguinte frontmatter e estrutura:

---
title: Tabela <nome>
audience: dev
related_table: <nome>
related_module: <inferir do nome>
status: draft
---

# Tabela `<nome>`

## Para que serve
(2-4 frases descrevendo o papel desta tabela no sistema)

## Colunas

<TableSpec table="<nome>" />

## Regras de negócio (RLS, triggers)

(Explicar em português o que cada policy permite/bloqueia e o que cada trigger faz.
Se houver `Estoque insuficiente` ou outras exceções, mencionar.)

## Como é usada nos módulos

(Listar quais services/queries/actions tocam esta tabela, baseado no que conseguir inferir.)

## Riscos e cuidados

(Apontar coisas como "nunca escrever direto em X — use a action Y".)

Regras:
- Use SEMPRE pt-BR.
- Não invente colunas: se não está na migration, não cite.
- Marque com `> TODO:` qualquer ponto que precisar de confirmação humana.
- Não inclua nada fora do frontmatter + corpo MDX.
```

> Os 5 templates seguem o mesmo padrão. O `claude-client.ts` injeta as variáveis e chama `generateText` (Vercel AI SDK).

---

## 9. Por que isso funciona "organicamente"

1. **Mesmo PR, mesmo diff.** O dev abre PR mexendo numa migration; antes de pedir review humano, o CI já anexou os rascunhos de doc no mesmo PR. A revisão de código e a revisão de doc viram **um único momento mental**.
2. **Hash-based, não timestamp.** Rodar a skill é determinístico. Reverter uma mudança no código reverte a "drift" sem ações manuais.
3. **Bot tem identidade própria.** Commits do `kb-maintainer-bot` são filtrados em `git blame` e podem ser ignorados em métricas — não confundem authorship.
4. **Sem dependência de cron.** A doc se atualiza no mesmo ritmo que o código, sem janelas de "esperar até segunda".
5. **Cooperação humano-IA explícita.** O nível DRAFT força a conversa: a IA propõe, o humano refina. Se o rascunho está bom, é um clique de aprovação; se não, é uma edição direta no diff.

---

## 10. Plano de implementação

| Fase                                      | Entrega                                                                                                        | Pré-requisito                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **M0 — Scaffold**                         | Estrutura de pastas, `SKILL.md`, `package.json`, templates vazios, workflow YAML que só faz dry-run e comenta. | Nenhum (pode rodar agora).                                  |
| **M1 — Detectores secos**                 | `sources/*.ts` parsers + `detect-drift.ts --dry-run` produzindo relatório. Sem aplicar nada ainda.             | Módulo KB **não** precisa existir; já parseia código atual. |
| **M2 — Manifest + targets MDX**           | `manifest.json`, leitura de MDX existentes, classificação completa para fontes que vivem no filesystem.        | F2 do plano KB (rotas `/docs` MDX).                         |
| **M3 — AUTO fixes**                       | `apply-auto.ts` executando os 5 fixes mecânicos. Commit no PR via Action.                                      | M1 + permissões do bot configuradas.                        |
| **M4 — DRAFT generation**                 | `generate-drafts.ts` chamando Claude para os 4 detectores DRAFT.                                               | M3 + `ANTHROPIC_API_KEY` no secrets.                        |
| **M5 — BLOCK + integração `kb_articles`** | Leitura/escrita em `kb_articles` via service role, detectores BLOCK, falha do CI.                              | F1 do plano KB (tabelas existentes).                        |
| **M6 — Auto-doc do próprio sistema**      | A skill se documenta: detector que falha se `kb_*` mudar e `references/kb-schema.md` ficar pra trás.           | M5.                                                         |

> M0–M2 podem rodar **antes** do módulo KB existir, porque varrem só o filesystem. M5 em diante exige o banco de pé.

---

## 11. Riscos e mitigação

| Risco                                           | Mitigação                                                                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Bot empurrando `[skip ci]` rouba commits do dev | Commit do bot tem mensagem com prefixo `docs(kb): auto-update` e a skill nunca toca arquivos `.ts/.sql` — só `.md/.mdx` e tabela `kb_*`. |
| Rascunho ruim suja a base                       | Tudo em DRAFT entra como `status='draft'` ou MDX com `status: draft` no frontmatter — a UI de `/manual` filtra isso por padrão.          |
| Custo de Claude sobe muito                      | Cache de hash impede regeneração. Limitar `generate-drafts` a no máximo N drafts por PR (config em `SKILL.md`).                          |
| Falso positivo BLOCK trava merges               | `BLOCK` aceita override via comentário `/kb-maintainer ignore <regra>` no PR (label-based). Auditoria em `audit_log`.                    |
| Race entre múltiplos PRs tocando KB             | Concurrency group no workflow + manifesto sempre re-lido antes de aplicar fixes.                                                         |
| Service role key vazada                         | Secrets do GH; jamais ecoada em logs; jobs em forks bloqueados; nada de `pull_request_target`.                                           |

---

## 12. O que **não** entra na v1

- Auto-tradução. Tudo pt-BR só.
- Inferência de fluxos de UI (não tem como detectar drift de "tela X mudou de lugar"). Continua manual.
- Geração de vídeos Remotion novos do zero. Só re-render de existentes.
- Geração de testes a partir de migrations. (Ideia de v2.)

---

## 13. Definition of Done (skill)

- [ ] `.claude/skills/kb-maintainer/SKILL.md` no repo, descrevendo a metodologia.
- [ ] Workflow `kb-maintain.yml` rodando em PRs do tipo escopo (verificar com PR de teste).
- [ ] Bot `kb-maintainer-bot` criado, PAT configurado em `KB_BOT_TOKEN`.
- [ ] Cobertura completa dos 13 detectores listados na seção 2.
- [ ] Comentário no PR sempre presente, mesmo quando não há drift (mostra "✅ KB sincronizada").
- [ ] Skill contribui para si mesma: M6 implementado.
- [ ] `references/kb-schema.md` auto-regenerado a cada mudança em `kb_*`.

---

## 14. Próximos passos

1. **Aprovar este desenho** (ou pedir ajustes).
2. Eu entrego os artefatos M0 ainda hoje (scaffold da skill + workflow YAML + design das fases). Os scripts viram código real à medida que as fases do plano KB avançam.
3. Recomendo começar a implementação real só após **F1 do plano KB** (manual editável CRUD), porque aí já temos o modelo de dados onde a maior parte dos detectores escreve.

---

## 15. Phase gates — validar entregas sem hospedar nada

A skill estende o conceito de "drift" para o **plano**, não só para a doc. Cada fase F0..F5 do roadmap em `docs/KNOWLEDGE-BASE-ARCHITECTURE.md` tem um checklist programático em `phases/f<n>.ts`. Um item do checklist não é prosa — é um `PhaseCheck` com `kind` + parâmetros que o runner sabe executar.

### Por que phase gate em vez de hospedar um serviço de validação?

A pergunta original era "posso validar cada entrega sem hospedar nada novo?". Resposta: sim, e fica **mais profissional**, não menos. Toda a infra cabe em três coisas que o ERP já consome:

| Componente | Onde mora                                                | O que faz                                                                                                                                    |
| ---------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Runner     | `.claude/skills/kb-maintainer/scripts/validate-phase.ts` | Lê o checklist da fase, executa cada check, gera relatório `.md` + `.json`.                                                                  |
| Workflow   | `.github/workflows/phase-gate.yml`                       | Roda em PR e em push para `main`. Comenta o relatório no PR (sticky por fase) e sobe o report como artifact.                                 |
| Secrets    | GitHub Actions secrets                                   | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` para o check `supabase-table-exists`. Tudo opcional — sem secrets, o check é pulado, não falha. |

Não há servidor novo, não há cron, não há banco extra. O runner é estado-puro contra o filesystem, exceto o check opcional que consulta o Supabase do projeto.

### Tipos de check (v1)

| Kind                    | Verifica                                                 | Exemplo de uso                                      |
| ----------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| `file-exists`           | Glob casa pelo menos um arquivo                          | "existe migration `*_kb_articles.sql`?"             |
| `file-contains`         | Regex bate dentro de um arquivo                          | "barrel exporta `listArticles`?"                    |
| `package-json-has`      | Dependência presente                                     | "`@remotion/player` instalado?"                     |
| `menu-has-permission`   | Item de `MODULES_MENU` com `requiresPermission` esperado | "menu tem entrada para `kb:article:read`?"          |
| `permissions-present`   | Seed de permissions tem todas as listadas                | "as 5 permissões `kb:*` foram seedadas?"            |
| `barrel-exports`        | Barrel reexporta nomes esperados                         | "módulo `kb` exporta `KbArticle` e `listArticles`?" |
| `shell`                 | Comando sai com `0`                                      | "`npm run lint` passa?"                             |
| `supabase-table-exists` | Tabela existe no banco linkado                           | "tabela `kb_articles` foi criada de fato?"          |

Adicionar um novo `kind` é localizado: tipo em `scripts/phases.ts`, handler em `scripts/validate-phase.ts` (`runCheck`).

### Severidade dos checks

Cada `PhaseCheck` tem `required: boolean`.

- `required: true` (default) → falha derruba a fase. Bloqueia o gate no CI.
- `required: false` → aparece como `warn` no relatório. Não derruba o gate, mas fica visível.

Use `required: false` para metas qualitativas que ainda valem registrar (ex.: "página `/docs` tem skeleton" antes da fase em que isso é DoD oficial).

### Mapa fase → checks atuais

| Fase                        | Foco                                               | Checks principais                                                                                                                                         |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F0 — Fundação**           | Migrations + permissions + menu + rota placeholder | 9 checks (4 migrations, barrel `kb`, menu com `kb:article:read`, 5 permissões seedadas, rota `(dashboard)/manual`, `lint`, `typecheck`, tabela opcional). |
| **F1 — Manual editável**    | CRUD de artigos + RLS                              | Migration de RLS, ações `createArticle/updateArticle/publishArticle` no barrel, página `/manual/[slug]`, dependência `@tiptap/react`.                     |
| **F2 — Doc Técnica MDX**    | Pipeline MDX + sidebar                             | `next-mdx-remote`, `remark-gfm`, `rehype-slug` instalados; rota `/docs/[...slug]`; pelo menos 3 MDX em `src/content/docs/`.                               |
| **F3 — Remotion**           | 3 modos integrados                                 | `@remotion/player`, `@remotion/renderer`, `@remotion/bundler`; `src/remotion/Root.tsx`; rota `/api/remotion/render`.                                      |
| **F4 — IA (RAG + copilot)** | Busca semântica + chat                             | `ai`, `@ai-sdk/anthropic`; migration de `kb_embeddings` (pgvector); rota `/api/kb/search`; rota `/api/kb/chat`.                                           |
| **F5 — Polimento**          | Audit, métricas, override                          | Migration `audit_log`, métricas `kb_views`, label `kb-skip-*` documentado, M6 do kb-maintainer ativo.                                                     |

> F1..F5 começam com o checklist estrutural. Conforme cada fase entra em planejamento detalhado, novos checks granulares são acrescentados em `phases/f<n>.ts`.

### Fluxo no GitHub Action

`.github/workflows/phase-gate.yml`:

1. Trigger: `pull_request` com paths-filter (toca migrations, módulos, menu, content/docs, remotion, package.json ou phases), `push` para `main`, `workflow_dispatch` com input `phase`.
2. Resolve target: PR/push → `--all`; manual → `--phase F<n>`.
3. Roda `npx tsx scripts/validate-phase.ts $args --report-path report.md --json-out report.json`.
4. Comenta `report.md` no PR (sticky com header `phase-gate-<label>`).
5. Faz upload de `report.md` + `report.json` como artifact (retenção 30 dias).
6. Se exit ≠ 0, falha o check.

### Quando rodar manualmente

```bash
# Antes de abrir PR, para auto-checar a fase em que você está
npx tsx scripts/validate-phase.ts --phase F0

# Para ver o panorama de tudo, com warnings de fases futuras
npx tsx scripts/validate-phase.ts --all

# Smoke test idempotente: rodar 2x deve dar o mesmo resultado
npx tsx scripts/validate-phase.ts --phase F0 && \
npx tsx scripts/validate-phase.ts --phase F0
```

### Princípio do phase gate

> Cada item do plano vira um check. Se um item não tem check, ele não é DoD — é desejo.

A consequência prática: refinar o plano e refinar o checklist são a **mesma atividade**. PR que adiciona uma DoD acrescenta um `PhaseCheck`; PR que remove uma DoD remove o check. O plano deixa de ser PDF e vira código vivo.

### Limitações conhecidas

- Não verifica conteúdo semântico ("o artigo está bom?"). Só estrutura. Conteúdo é coberto pelo classificador de drift em `detect-drift.ts`.
- `supabase-table-exists` consulta o projeto **linkado** — em PRs de fork, sem secrets, é pulado. Não há fallback para uma "Supabase de teste".
- `shell` com `npm run lint`/`typecheck` herda os custos desses comandos (tempo + memória do CI). Se virar gargalo, dá pra restringir ao escopo do diff.
