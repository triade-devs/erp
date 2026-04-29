# Revisão Completa das Funções de Estoque — Design

## Problema

O módulo `inventory` cobre gestão de produtos e movimentações de estoque num ERP multi-tenant. Precisa de uma revisão sistemática para identificar bugs, gaps funcionais, falhas de segurança e lacunas de cobertura de testes antes de avançar para novas funcionalidades.

## Abordagem

Revisão sequencial por camada (de baixo para cima), auditando cada camada em 4 eixos. Entregável: relatório de achados priorizados + plano de correções.

---

## Escopo

### Arquivos revisados

| Camada               | Arquivos                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------- |
| 1. Migrations/DB     | `supabase/migrations/*_stock*`, `*_movements*`, migrations de produtos e RLS relacionados |
| 2. Schemas Zod       | `src/modules/inventory/schemas/index.ts`                                                  |
| 3. Services          | `src/modules/inventory/services/stock-service.ts`                                         |
| 4. Actions           | `src/modules/inventory/actions/*.ts` (5 actions)                                          |
| 5. Queries           | `src/modules/inventory/queries/*.ts` (3 queries)                                          |
| 6. UI Components     | `src/modules/inventory/components/*.tsx`                                                  |
| 7. Testes existentes | `src/modules/inventory/actions/__tests__/*.test.ts`                                       |

### Fora de escopo

- Aplicar correções (vai para plano de implementação separado)
- Módulos sem relação direta com estoque (billing, auth flow, etc.)
- Redesign de arquitetura

---

## 4 Eixos de Auditoria (por camada)

- 🔴 **Bugs** — comportamento incorreto ou inconsistente
- 🟡 **Gaps funcionais** — funcionalidade ausente ou incompleta
- 🔵 **Segurança/Multi-tenant** — RLS, permissões, isolamento
- 🟢 **Cobertura de testes** — o que falta testar

---

## Processo de Execução

1. Para cada camada, auditar todos os arquivos relevantes nos 4 eixos.
2. Classificar achados por severidade:
   - 🔴 **Alta** — bug ativo, falha de segurança, ou dado corrompível
   - 🟡 **Média** — comportamento inesperado, gap funcional relevante
   - 🟢 **Baixa** — melhoria de qualidade, test coverage, refatoração
3. Consolidar achados em `docs/superpowers/reports/stock-review-report.md`.
4. Gerar plano de correções ordenado por prioridade com tasks atômicas.
5. Nenhuma correção é aplicada durante a revisão.

---

## Candidatos a Achados (identificados durante exploração)

Estes pontos devem ser verificados formalmente na revisão:

1. `reactivateProductAction` usa permissão `inventory:product:delete` em vez de uma permissão dedicada de reativação.
2. `updateProductAction` e `deleteProductAction` não verificam `count` de rows afetados (0 rows = silencioso).
3. A migration `20260420000003_stock_movements.sql` não define coluna `company_id`, mas `registerMovementAction` insere esse campo — verificar se outra migration o adiciona.
4. Zero testes unitários para `validateMovement()` e `calculateNewStock()`.
5. Ausência de happy-path tests para todas as actions.
6. `reactivateProductAction` sem nenhum teste.
7. `movementSchema` bloqueia `quantity = 0` para `adjustment` — pode bloquear zeragem legítima de estoque.

---

## Entregáveis

1. **`docs/superpowers/reports/stock-review-report.md`** — relatório de achados com severidade, localização (arquivo:linha) e correção sugerida para cada item.
2. **Plano de implementação** (via `writing-plans`) — tasks atômicas de correção ordenadas por prioridade, prontas para execução.

---

## Critérios de Conclusão

- Todos os 7 layers auditados nos 4 eixos
- Cada achado tem: arquivo, linha (quando aplicável), descrição, severidade, correção sugerida
- Relatório tem seção "Próximos Passos" ordenada por prioridade
- Plano de correções tem tasks independentes e atômicas
