---
name: kb-maintainer
description: Mantém a Base de Conhecimento do ERP em sincronia com o código de forma orgânica. Detecta drift entre migrations/módulos/permissions/Remotion e a doc (artigos kb_articles + MDX em src/content/docs), aplica fixes de baixo risco automaticamente, gera rascunhos para mudanças estruturais e bloqueia merges quando há referências órfãs. Também valida o checklist de Definition-of-Done de cada fase do plano (F0..F5) via `validate-phase.ts`. Use sempre que a doc do ERP precisar ser atualizada por causa de uma mudança de código, quando alguém perguntar "a doc está atualizada?", quando precisar gerar um artigo a partir de uma tabela/módulo/permissão, quando o CI reclamar de drift ou de fase, ou quando você for adicionar um novo detector. Não use para gerar conteúdo livre/criativo de manual — só para sincronização sistemática.
---

# kb-maintainer

Mantém a Base de Conhecimento do ERP **organicamente sincronizada** com o código. O design completo está em `docs/KB-MAINTAINER-SKILL.md` na raiz do repo. Esta SKILL.md é o guia operacional resumido.

## Para que serve

O ERP tem dois tipos de doc:

1. **Manual do Usuário** — artigos editáveis na tabela `kb_articles` (banco), criados via UI por admins.
2. **Doc Técnica** — MDX versionado em `src/content/docs/`, escrito por devs em PRs.

Esta skill **detecta** quando a doc fica fora de sincronia com a fonte (migrations, barrels de módulo, seed de permissions, composições Remotion) e age conforme a severidade. Adicionalmente, **valida fases**: cada entrega prevista no plano (F0..F5) tem um checklist programático que precisa ficar verde antes de avançar.

## Quando invocar

- Antes de mergear PR que toca `supabase/migrations/`, `src/modules/`, `src/remotion/` ou `src/content/docs/`.
- Quando o GitHub Action `kb-maintain` falhar com `BLOCK`.
- Quando o GitHub Action `phase-gate` falhar para alguma fase.
- Quando precisar gerar um artigo novo a partir de uma tabela/módulo já existente.
- Quando alguém perguntar "essa doc está atualizada?".
- No fim de cada fase, antes de declarar a entrega como concluída.

## Modos de execução

```bash
# CI: detecta tudo, aplica AUTO, gera DRAFT, falha em BLOCK
npx tsx scripts/detect-drift.ts --ci

# Local seco: só relata, não escreve nada
npx tsx scripts/detect-drift.ts --dry-run

# Geração sob demanda
npx tsx scripts/generate-drafts.ts --target mdx --slug tabelas/produtos
npx tsx scripts/generate-drafts.ts --target kb_articles --slug como-dar-baixa-em-estoque

# Validação de fase (Definition-of-Done programático)
npx tsx scripts/validate-phase.ts --phase F0          # uma fase
npx tsx scripts/validate-phase.ts --all               # todas
npx tsx scripts/validate-phase.ts --phase F0 \
  --report-path report.md --json-out report.json      # com saída para CI
```

## Severidade dos drifts

| Severidade | Ação                                                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| **AUTO**   | Fix mecânico, aplicado direto no PR branch (regenerar embeddings, atualizar célula de tabela, re-render de vídeo).       |
| **DRAFT**  | Mudança estrutural — gera rascunho (MDX `status: draft` ou linha em `kb_articles` com `status='draft'`) e comenta no PR. |
| **BLOCK**  | Referência destrutiva (tabela documentada que sumiu, permissão dropada que está em artigo publicado). Falha o CI.        |

**Princípio:** se na dúvida entre `AUTO` e `DRAFT`, escolha `DRAFT`. Doc errada é pior que doc desatualizada.

Veja `references/classifier-rules.md` para a tabela completa dos 13 detectores da v1.

## Fluxo no CI — drift

`.github/workflows/kb-maintain.yml` dispara em PRs com paths-filter. O workflow:

1. Roda `detect-drift.ts --ci` → produz `report.md` e `report.json`.
2. Comenta o relatório no PR (sticky — atualiza o mesmo comentário a cada push).
3. Se houver `BLOCK > 0`: **falha o check**.
4. Senão: commita os fixes `AUTO` e os `DRAFT`s gerados na própria branch do PR, com identidade `kb-maintainer-bot`.

## Validação de fases (phase gate)

O plano da Base de Conhecimento é entregue em fases F0..F5 (ver `docs/KNOWLEDGE-BASE-ARCHITECTURE.md`). Cada fase tem um checklist em `phases/f<n>.ts` cujos itens são **checks executáveis**, não prosa. O runner `scripts/validate-phase.ts` roda cada check e emite um relatório markdown + JSON.

Tipos de check suportados (ver `scripts/phases.ts`):

- `file-exists` — arquivo ou glob deve existir.
- `file-contains` — regex deve casar dentro de um arquivo.
- `package-json-has` — dependência presente em `dependencies`/`devDependencies`.
- `menu-has-permission` — `MODULES_MENU` em `src/core/navigation/menu.ts` tem item com `requiresPermission` esperado.
- `permissions-present` — seed em `supabase/migrations/**permissions**.sql` contém todas as permissões listadas.
- `barrel-exports` — barrel do módulo (`src/modules/<x>/index.ts`) reexporta os nomes esperados.
- `shell` — comando arbitrário deve sair com código 0 (usado para `npm run lint` e `npm run typecheck`).
- `supabase-table-exists` — opcional, exige `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Sem credenciais o check é pulado (warn) em vez de falhar.

Exit codes do runner: `0` quando tudo passa; `1` quando há check `required` falhando; `2` em erro de invocação.

Workflow correspondente: `.github/workflows/phase-gate.yml`. Roda em PR (paths-filter), em push para `main` e via `workflow_dispatch`. Comenta o relatório no PR (sticky por fase) e sobe `report.md`/`report.json` como artifact por 30 dias.

**Princípio do phase gate:** cada item do plano vira um check. Se um item não tem check, ele não é DoD — é desejo.

## Como adicionar um novo detector

1. Crie um arquivo em `scripts/sources/` (se for fonte nova) ou em `scripts/targets/` (se for novo destino documentado).
2. Implemente uma função que retorne `DriftItem[]` (veja `scripts/types.ts`).
3. Registre o detector em `scripts/detect-drift.ts` (array `DETECTORS`).
4. Adicione a regra de severidade em `scripts/classify.ts` e documente em `references/classifier-rules.md`.
5. Se gerar conteúdo, crie um template em `templates/` e registre em `scripts/generate-drafts.ts`.
6. **Importante:** atualize `references/kb-schema.md` se mexer em tabela `kb_*`. A skill detecta esse drift e bloqueia o próprio CI dela.

## Como adicionar um novo check de fase

1. Edite `phases/f<n>.ts` e acrescente um item ao array `checks`.
2. Use um dos `CheckKind` existentes em `scripts/phases.ts`. Se precisar de um novo kind, adicione em `scripts/phases.ts` e implemente o handler em `scripts/validate-phase.ts` (função `runCheck`).
3. Marque `required: true` para itens bloqueantes; `false` para "nice-to-have" que aparecem como warn no relatório.
4. Rode local: `npx tsx scripts/validate-phase.ts --phase F<n>`.

## Templates de geração

`templates/*.md` são prompts no estilo do Claude. Cada um tem placeholders `{{var}}` substituídos por `scripts/lib/claude-client.ts`. Os 5 atuais estão listados em `references/prompt-engineering.md`.

## Convenções não-negociáveis

- **pt-BR sempre.** Comentários, mensagens, conteúdo gerado.
- **Não toque em `.ts`/`.sql`/`.tsx`.** A skill só edita `.md`/`.mdx` no filesystem e linhas em `kb_*` no banco. (Os arquivos do próprio scaffold da skill são exceção — são código dela.)
- **Manifesto é fonte de verdade do que está sincronizado.** Sempre re-leia `.kb-maintainer/manifest.json` antes de aplicar fixes.
- **Service role key nunca em logs.** Use `lib/supabase.ts` que faz scrubbing.
- **Idempotência.** Rodar a skill 3x seguidas sem mudanças no código deve gerar zero diff.

## Override manual

Em PR, comentar `/kb-maintainer ignore <regra>` (label `kb-skip-<regra>`) faz a skill pular aquela regra naquele PR. Override fica auditado em `audit_log` quando M5 estiver implementado.

## Estado de implementação

A skill é entregue em fases (M0 a M6 — veja seção 10 do design doc).

Esta versão é **M0 — Scaffold**: estrutura, types, classificador e workflow funcionando em modo `--dry-run`. Detectores reais entram a partir de M1. O **validador de fases (`validate-phase.ts`) já está funcional** com checklist de F0..F5 — F0 com 9 checks reais, F1..F5 com checks estruturais (a serem refinados conforme cada fase é planejada em detalhe). Cada arquivo `scripts/**/*.ts` que ainda é placeholder está marcado com `// TODO(M1)` ou `// TODO(M3)`. Não remova esses marcadores sem implementar a função.
