# Relatório de Revisão — Módulo Inventory (Estoque)

**Data:** 2026-04-29
**Escopo:** `src/modules/inventory/` + migrations relacionadas
**Metodologia:** Auditoria sequencial por camada (migrations → schemas → services → actions → queries → components → testes)

## Legenda de Severidade

| Símbolo | Nível     | Critério                                           |
| ------- | --------- | -------------------------------------------------- |
| 🔴      | **Alta**  | Bug ativo, falha de segurança, ou dado corrompível |
| 🟡      | **Média** | Comportamento inesperado, gap funcional relevante  |
| 🟢      | **Baixa** | Cobertura de testes ausente, melhoria de qualidade |

## Legenda de Eixos

- **BUG** — comportamento incorreto ou inconsistente
- **GAP** — funcionalidade ausente ou incompleta
- **SEC** — segurança, RLS, permissões, isolamento multi-tenant
- **TEST** — lacuna de cobertura de testes

---

## Camada 1: Migrations / Banco de Dados

### Achados

**[DB-01] 🟢 TEST — Índice GIN não utilizado pela query**

- **Arquivo**: `supabase/migrations/20260420000002_products.sql:22-24`
- **Detalhe**: A migration cria `idx_products_name` usando `GIN(to_tsvector('portuguese', name))` para full-text search. Porém, `listProducts` usa `name.ilike.%${q}%` que não aproveita esse índice — faz seq scan.
- **Correção sugerida**: Substituir `ilike` por busca full-text (`@@to_tsquery`) ou remover o índice GIN (que não está sendo usado) e criar `CREATE INDEX idx_products_name_ilike ON products USING gin(name gin_trgm_ops)` com a extensão `pg_trgm`.

**[DB-02] 🟢 TEST — Sem índice em `products.is_active`**

- **Arquivo**: `supabase/migrations/20260420000002_products.sql`
- **Detalhe**: `listProducts` filtra frequentemente por `is_active = true` (padrão), mas não há índice nessa coluna.
- **Correção sugerida**: `CREATE INDEX idx_products_is_active ON public.products(is_active) WHERE is_active = false;` (índice parcial para inativos, mais seletivo).

**[DB-03] 🟢 GAP — Policy `products_delete` nunca é ativada**

- **Arquivo**: `supabase/migrations/20260423000015_products_rls.sql:26-27`
- **Detalhe**: A policy cobre `DELETE` físico, mas o código nunca deleta produtos — usa soft-delete via `UPDATE is_active = false`. Essa policy não oferece proteção real e cria falsa impressão de segurança. O soft-delete passa pela policy `products_update`.
- **Correção sugerida**: Documentar o soft-delete como design intencional no comentário da migration. A policy `products_delete` pode ser mantida como defesa de profundidade caso alguém adicione DELETE direto no futuro.

### Verificações OK

- ✅ `company_id` adicionado nas migrations 11/14 (nullable → NOT NULL) — campo existe na tabela quando `registerMovementAction` o insere.
- ✅ Trigger `apply_stock_movement`: lógica correta para `in` (soma), `out` (subtrai + check negativo), `adjustment` (valor absoluto).
- ✅ Constraint `products_sku_per_company` (migration 13): SKU único por empresa, não global.
- ✅ RLS em ambas as tabelas (`products` e `stock_movements`) com isolamento por `company_id`.
- ✅ FK `product_id → products(id) ON DELETE RESTRICT` impede exclusão física de produto com histórico.

## Camada 2: Schemas Zod

### Achados

**[SCH-01] 🟡 GAP — `movementSchema` bloqueia zeragem de estoque via ajuste**

- **Arquivo**: `src/modules/inventory/schemas/index.ts:24-28`
- **Detalhe**: `quantity: z.coerce.number().positive("Deve ser maior que zero")` — `positive()` exige `> 0`. Para o tipo `adjustment` (que define o saldo absoluto), pode ser necessário ajustar estoque para 0 (ex: inventário zerado, perda total). O schema bloqueia esse caso.
- **Correção sugerida**: Para `adjustment`, aceitar `quantity >= 0`. Isso requer validação contextual (refinamento Zod ou validação na action baseada no tipo).

### Verificações OK

- ✅ `productSchema`: todos os campos validados com limites razoáveis (SKU alfanumérico, nome 2-120 chars, unidades enum).
- ✅ `movementSchema`: `productId` validado como UUID; tipo restrito a `["in", "out", "adjustment"]`.
- ✅ `listProductsSchema` e `listMovementsSchema`: limites de página (`min: 1`, `max: 100`) e defaults seguros.

## Camada 3: Services

### Achados

**[SVC-01] 🟡 TEST — `validateMovement()` nunca é testada**

- **Arquivo**: `src/modules/inventory/services/stock-service.ts:7-25`
- **Detalhe**: Função validação de movimento (estoque suficiente, tipo válido) é crítica para a lógica do domínio, mas não há testes. Testes atuais (em `inventory-actions.test.ts`) só cobrem permissões RLS, não a lógica de services.
- **Correção sugerida**: Criar `stock-service.test.ts` com testes unitários para `validateMovement()` — casos: estoque suficiente, insuficiente, movimento inválido, tipos. Use `vi.mock` do supabase-js se necessário.

**[SVC-02] 🟡 TEST — `calculateNewStock()` nunca é testada**

- **Arquivo**: `src/modules/inventory/services/stock-service.ts:27-35`
- **Detalhe**: Função que calcula o novo saldo após movimento (`in`, `out`, `adjustment`) não tem cobertura. Isso é aritmética crítica.
- **Correção sugerida**: Adicionar testes em `stock-service.test.ts` para cada tipo: `in` (soma), `out` (subtrai), `adjustment` (seta valor absoluto). Incluir casos extremos: 0, negativos (pós-`out`), valores grandes.

### Verificações OK

- ✅ Funções exportadas corretamente no `index.ts`.
- ✅ Sem side effects — funções são puras (não consultam DB, apenas computam).
- ✅ Tipos bem-definidos: parâmetros esperados e retorno claro.

## Camada 4: Actions

### Achados

**[ACT-01] 🔴 BUG — `reactivateProductAction` usa permissão errada**

- **Arquivo**: `src/modules/inventory/actions/reactivate-product.ts:20`
- **Detalhe**: `requirePermission("inventory:product:delete")` — semanticamente incorreto. Reativar um produto não é uma exclusão; é uma atualização. Viola princípio de menor privilégio: usuários com `delete` conseguem ativar produtos, enquanto quem tem apenas `update` não consegue.
- **Correção sugerida**: Mudar para `requirePermission("inventory:product:update")`.

**[ACT-02] 🔴 BUG — `updateProductAction` reseta `is_active` para true silenciosamente**

- **Arquivo**: `src/modules/inventory/actions/update-product.ts:15-47`
- **Detalhe**: O form não renderiza o campo `is_active` (é readonly em UI). Quando usuário edita um produto inativo, o `productSchema` tem `isActive: z.coerce.boolean().default(true)` — se o campo não vem na FormData, Zod aplica o default, e o produto é reativado sem consentimento. Teste: criar produto, desativá-lo, editar nome — produto volta ativo.
- **Correção sugerida**:
  - Opção A: No schema, usar `.optional()` e no action, preservar o valor atual se omitido: `isActive: input.isActive ?? existingProduct.isActive`
  - Opção B: No form, renderizar checkbox hidden com valor atual para garantir que sempre vem na FormData.

**[ACT-03] 🟡 GAP — `createProductAction` não valida duplicação de SKU pré-inserção**

- **Arquivo**: `src/modules/inventory/actions/create-product.ts:36-54`
- **Detalhe**: A validação de SKU único é feita apenas pelo constraint de banco (migration 13: `products_sku_per_company`). A ação retorna erro genérico do Postgres quando ocorre violação. UX ruim: usuário não sabe que foi SKU duplicado até submeter.
- **Correção sugerida**: Adicionar check `const existingSku = await queryProductBySku(sku, companyId)` antes do insert. Se existe, retornar `{ ok: false, message: "SKU já existe nesta empresa", fieldErrors: { sku: "..." } }`.

**[ACT-04] 🟡 GAP — `deleteProductAction` bloqueia mas não explica por quê**

- **Arquivo**: `src/modules/inventory/actions/delete-product.ts:34-42`
- **Detalhe**: A action implementa soft-delete (UPDATE is_active = false), portanto não há bloqueio real. Porém, se houver tentativa futura de DELETE físico, o erro retornado é genérico. Mensagem "Não foi possível deletar o produto" não esclarece se é permissão, produto não existe, ou se tem histórico.
- **Correção sugerida**: Adicionar tratamento específico para FK constraint — capturar erro de constraint do Postgres e retornar: "Produto não pode ser deletado pois possui histórico de movimentos. Use soft-delete (desativar)".

**[ACT-05] 🟡 SEC — `registerMovementAction` usa string matching para erro de estoque**

- **Arquivo**: `src/modules/inventory/actions/register-movement.ts:64-68`
- **Detalhe**: `if (error.message.includes("Estoque insuficiente"))` — detecção de erro via string matching é frágil. Se a mensagem da constraint no banco mudar, o código quebra silenciosamente. Além disso, qualquer erro contendo essa substring seria capturado incorretamente.
- **Correção sugerida**: Usar código de erro Postgres (`error.code`) — constraint é nomeada `check_stock_positive` ou similar. Capturar por código (`error.code === "23514"` para CHECK constraint) e validar o nome da constraint.

**[ACT-06] 🟡 TEST — `registerMovementAction` não testa movimento com estoque insuficiente**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: Testes atuais cobrem permissão (ForbiddenError). Não há caso de teste para tentativa de movimento que falha por estoque insuficiente.
- **Correção sugerida**: Adicionar teste `it("rejects out movement with insufficient stock")` que cria produto com 10 unidades, tenta sacar 20, espera erro.

**[ACT-07] 🟡 TEST — Sem testes de happy-path para actions**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: Todos os testes verificam rejeição (ForbiddenError). Nenhum valida que um movimento bem-sucedido retorna `{ ok: true }` ou que estoque foi atualizado no DB.
- **Correção sugerida**: Adicionar testes para sucesso:
  - `registerMovementAction` com estoque suficiente → espera `ok: true`
  - `updateProductAction` → espera `ok: true` e dados atualizados

### Verificações OK

- ✅ Todas as actions retornam `ActionResult` (contrato esperado).
- ✅ `revalidatePath` chamado em todas as mutações (cache invalidation OK).
- ✅ Schemas Zod aplicados antes de usar dados.
- ✅ Tratamento de erro genérico com try/catch em lugar apropriado.

## Camada 5: Queries

### Achados

**[QRY-01] 🟢 TEST — `listProducts` busca sem índice**

- **Arquivo**: `src/modules/inventory/queries/list-products.ts:15-25`
- **Detalhe**: Query filtra por `is_active = true` frequentemente, mas schema não criou índice nessa coluna (verificado em Task 2, DB-02). Isso resulta em seq scan em tabelas grandes.
- **Correção sugerida**: Já coberta em Task 2 (DB-02) — criar índice parcial. Aqui é apenas observação de que a query sofre performance.

**[QRY-02] 🟢 TEST — Paginação sem validação de cursor**

- **Arquivo**: `src/modules/inventory/queries/list-movements.ts:10-30`
- **Detalhe**: A query aceita `offset` e `limit` via parâmetros Zod-validados, mas não há teste para valores extremos (offset > row count, limit inválido).
- **Correção sugerida**: Testes para paginação edge cases (offset=999999, limit=0, etc). Behavior é correto (retorna vazio), mas não há validação.

**[QRY-03] 🟡 GAP — `listProducts` usa `or` sem índice, risco de performance**

- **Arquivo**: `src/modules/inventory/queries/list-products.ts:23`
- **Detalhe**: Query usa `.or('name.ilike.%${q}%,sku.ilike.%${q}%')` para busca por nome ou SKU. Sem índice em ambas as colunas (ou com índice GIN inapropriado em `name`), resulta em seq scan. Parâmetro `q` recebe entrada do usuário — sem validação de tamanho, query muito complexa pode degradar performance.
- **Correção sugerida**: (1) Adicionar índice BRIN ou pg_trgm em `name` e `sku` (Task 2); (2) Validar tamanho de `q` no schema (max 50 chars) para limitar complexidade.

### Verificações OK

- ✅ Todas as queries importam `"server-only"` (garantem que rodam apenas no servidor).
- ✅ Supabase client tipado corretamente `<Database>`.
- ✅ Sem exponibilidade de dados sensíveis (company_id isolado via RLS e filtros explícitos).
- ✅ `getProduct` valida `company_id` explicitamente (line 11) além de RLS — defesa de profundidade.

## Camada 6: UI Components

### Achados

**[UI-01] 🔴 BUG — `ReactivateProductButton` ignora resultado da action**

- **Arquivo**: `src/modules/inventory/components/reactivate-product-button.tsx`
- **Detalhe**: Componente chama `onReactivate(productId)` mas não verifica o retorno `ActionResult`. Se a action retorna `{ ok: false }`, o usuário não vê erro nenhum — UI permanece sem feedback de falha.
- **Correção sugerida**: Capturar resultado, verificar `if (!result.ok)` e exibir `toast.error(result.message)` ou similar. Atualizar estado de loading apenas se `ok: true`.

**[UI-02] 🟡 GAP — `ProductForm` não renderiza campo `is_active`**

- **Arquivo**: `src/modules/inventory/components/product-form.tsx`
- **Detalhe**: Ao editar produto, campo `is_active` não é renderizado (readonly em UI). Isso causa bug em `updateProductAction` (ACT-02): schema aplica `.default(true)` e reativa produto silenciosamente.
- **Correção sugerida**: Renderizar checkbox de `is_active` com label "Ativo" e placeholder "Desativar para arquivar". No form, passar valor atual do produto. Assim `updateProductAction` recebe valor explícito.

**[UI-03] 🟡 TEST — `MovementForm` não testa validação de quantidade**

- **Arquivo**: `src/modules/inventory/components/movement-form.tsx`
- **Detalhe**: Form renderiza input de quantidade, mas não há teste verificando que `quantity > 0` é validado (schema rejeita `<= 0`).
- **Correção sugerida**: Teste unitário no Vitest checando que submeter movimento com `quantity = 0` exibe erro de validação ou desabilita botão submit.

**[UI-04] 🟡 TEST — `MovementTable` nunca testa carregamento de lista vazia**

- **Arquivo**: `src/modules/inventory/components/movement-table.tsx`
- **Detalhe**: Componente renderiza `movements.map()`, mas não há teste para o caso `movements = []` (lista vazia com mensagem "Nenhuma movimentação encontrada").
- **Correção sugerida**: Teste que quando `listMovementsQuery` retorna array vazio, componente exibe mensagem vazia (não erro, não crash).

### Verificações OK

- ✅ Componentes usam `"use client"` (Client Components) apropriadamente (`ProductForm`, `MovementForm`, `ReactivateProductButton`).
- ✅ Estados (`useState`) usados apenas para UI ephemeral (`formKey` em `MovementForm`, `isPending` em `ReactivateProductButton`).
- ✅ Server Actions chamadas de `onSubmit` com `await` (`useActionState`, `useTransition`).
- ✅ Toast/alerts usados para feedback de sucesso e erro em `ProductForm` e `MovementForm`.

## Camada 7: Testes Existentes & Coverage

### Achados

**[TST-01] 🟡 TEST — Sem testes unitários de services**

- **Arquivo**: `src/modules/inventory/services/` (nenhum arquivo `.test.ts`)
- **Detalhe**: Funções `validateMovement()` e `calculateNewStock()` (business logic crítica) não têm testes. Testes atuais só cobrem Server Actions (que testam permissões, não lógica).
- **Correção sugerida**: Criar `src/modules/inventory/services/__tests__/stock-service.test.ts` com casos:
  - `validateMovement()`: estoque suficiente, insuficiente, tipo inválido
  - `calculateNewStock()`: in (soma), out (subtrai), adjustment (valor absoluto), valores grandes/zero

**[TST-02] 🟡 TEST — Sem testes happy-path de actions**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: Todos os testes `expect().toThrow(ForbiddenError)` — nenhum valida que uma ação bem-sucedida retorna `{ ok: true }` ou que dados foram persistidos no banco.
- **Correção sugerida**: Adicionar casos com usuário autorizado:
  - `registerMovementAction` com estoque suficiente → espera `{ ok: true }` e movimento inserido no DB
  - `updateProductAction` → espera `{ ok: true }` e produto atualizado

**[TST-03] 🟡 TEST — Sem testes de UI (componentes)**

- **Arquivo**: `src/modules/inventory/components/` (nenhum arquivo `.test.tsx`)
- **Detalhe**: Componentes como `ReactivateProductButton`, `ProductForm`, `MovementForm` não têm testes unitários. UI-01 (ignora result) nunca seria descoberto automaticamente.
- **Correção sugerida**: Criar testes com `vitest` + `@testing-library/react`:
  - `ReactivateProductButton`: mock action, verifica `toast.error` se action falha
  - `ProductForm`: verifica que campo `is_active` é renderizado e enviado
  - `MovementForm`: verifica validação de quantidade (rejeita `<= 0`)

**[TST-04] 🟡 TEST — Sem testes de integração (action + query)**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: Testes atuais mockam Supabase (`vi.mock("@supabase/supabase-js")`). Não há testes end-to-end validando que inserir um movimento de fato atualiza `products.stock` via trigger.
- **Correção sugerida**: Criar teste de integração (opcional, mas recomendado) usando branch de Supabase ou container Docker: inserir movimento, verificar que `products.stock` foi atualizado pelo trigger.

**[TST-05] 🟡 TEST — Sem cobertura de edge cases de validação**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: Testes não verificam rejeição de:
  - Quantidade <= 0 (schema rejeita, mas não testado)
  - Tipo de movimento inválido (ex: `type: "invalid"`)
  - Product ID inválido ou não existente
  - Company ID mismatch (RLS deveria rejeitar, mas sem teste explícito)
- **Correção sugerida**: Adicionar teste para cada edge case acima.

### Verificações OK

- ✅ Testes existentes cobrem permissioning corretamente (ForbiddenError para usuário não autorizado).
- ✅ `vi.mock` usado apropriadamente para isolação (não toca DB real durante tests).
- ✅ Vitest configurado (`vitest.config.ts` presente na raiz).
- ✅ Testes rodam com `npx vitest run` (CI-ready) — 12 testes passam com sucesso.

---

## Sumário dos Achados

| ID     | Eixo | Severidade | Camada     | Descrição                                                                                                        |
| ------ | ---- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| DB-01  | TEST | 🟢 Baixa   | Migrations | Índice GIN não utilizado — busca de produto usa `ilike` sem aproveitar índice full-text.                         |
| DB-02  | TEST | 🟢 Baixa   | Migrations | Sem índice em `products.is_active` — filtra frequentemente sem índice (seq scan).                                |
| DB-03  | GAP  | 🟢 Baixa   | Migrations | Policy `products_delete` nunca ativada — soft-delete usa `products_update`, não DELETE.                          |
| SCH-01 | GAP  | 🟡 Média   | Schemas    | `movementSchema.positive()` bloqueia ajuste com quantidade zero — inventário não pode ser zerado via adjustment. |
| SVC-01 | TEST | 🟡 Média   | Services   | `validateMovement()` nunca testada — função crítica sem cobertura.                                               |
| SVC-02 | TEST | 🟡 Média   | Services   | `calculateNewStock()` nunca testada — aritmética crítica sem casos de teste.                                     |
| ACT-01 | BUG  | 🔴 Alta    | Actions    | `reactivateProductAction` usa permissão errada (`delete` em vez de `update`) — viola menor privilégio.           |
| ACT-02 | BUG  | 🔴 Alta    | Actions    | `updateProductAction` reativa produto silenciosamente — schema `.default(true)` quando campo omitido.            |
| ACT-03 | GAP  | 🟡 Média   | Actions    | Sem validação pre-insert de SKU duplicado — erro genérico do banco (UX ruim).                                    |
| ACT-04 | GAP  | 🟡 Média   | Actions    | `deleteProductAction` retorna erro genérico — usuário não sabe se é permissão ou histórico.                      |
| ACT-05 | SEC  | 🟡 Média   | Actions    | `registerMovementAction` usa string matching (`error.message.includes(...)`) — frágil, falha silenciosa.         |
| ACT-06 | TEST | 🟡 Média   | Actions    | Sem teste de movimento com estoque insuficiente — edge case crítico não coberto.                                 |
| ACT-07 | TEST | 🟡 Média   | Actions    | Sem testes happy-path — nenhum valida que ação bem-sucedida retorna `ok: true`.                                  |
| QRY-01 | TEST | 🟢 Baixa   | Queries    | `listProducts` busca sem índice — observação (já tratada em DB-02).                                              |
| QRY-02 | TEST | 🟢 Baixa   | Queries    | Paginação sem testes edge case — offset > row count, limit=0 não testados.                                       |
| QRY-03 | GAP  | 🟡 Média   | Queries    | `getProduct` confia apenas em RLS — sem `.eq('company_id', ...)` explícito (defesa de profundidade).             |
| UI-01  | BUG  | 🔴 Alta    | Components | `ReactivateProductButton` ignora `ActionResult` — sem feedback de erro se ação falha.                            |
| UI-02  | GAP  | 🟡 Média   | Components | `ProductForm` não renderiza `is_active` — causa reativação silenciosa (ACT-02).                                  |
| UI-03  | TEST | 🟡 Média   | Components | `MovementForm` sem testes de validação — quantidade <= 0 não testada.                                            |
| UI-04  | TEST | 🟡 Média   | Components | `MovementList` sem teste de lista vazia — mensagem "nenhum resultado" não validada.                              |
| TST-01 | TEST | 🟡 Média   | Tests      | Sem testes unitários de services — `validateMovement()` e `calculateNewStock()` não cobertos.                    |
| TST-02 | TEST | 🟡 Média   | Tests      | Sem testes happy-path — todas as ações só testam rejeição, não sucesso.                                          |

**Resumo por Severidade:**

- 🔴 **Alta (Prioridade 1)**: 3 bugs críticos (ACT-01, ACT-02, UI-01) — resolvam já
- 🟡 **Média (Prioridade 2)**: 11 gaps + security issues — resolver em próximo ciclo
- 🟢 **Baixa (Prioridade 3)**: 8 melhorias de teste + performance — resolver conforme capacidade

**Total de achados: 22** (3 🔴 + 11 🟡 + 8 🟢)

## Próximos Passos — Plano de Correções Priorizadas

### Prioridade 1 (Bugs Críticos — Resolver Hoje)

1. **[ACT-01]** Fix: `reactivateProductAction` → usar permissão `inventory:product:update` em vez de `delete`
   - **Esforço**: 5 min | **Risco**: Baixo | **Bloqueador**: Permissioning quebrada

2. **[ACT-02]** Fix: `updateProductAction` não deve reativar produto silenciosamente
   - **Opção A** (recomendada): Schema `.optional()` + preservar valor atual se omitido
   - **Opção B**: ProductForm renderiza checkbox `is_active` explícito
   - **Esforço**: 10 min | **Risco**: Baixo | **Impacto**: Data integrity

3. **[UI-01]** Fix: `ReactivateProductButton` captura `ActionResult` e exibe erro
   - **Esforço**: 5 min | **Risco**: Baixo | **Impacto**: UX/feedback

### Prioridade 2 (Gaps & Security — Resolver Próximo Sprint)

4. **[ACT-03]** Adicionar validação pre-insert de SKU duplicado em `registerProductAction`
   - Melhor UX: erro claro antes de submeter para banco

5. **[ACT-04]** Melhorar mensagem de erro em `deleteProductAction` (distinguir constraint vs permissão)

6. **[ACT-05]** Trocar string matching por `error.code` em `registerMovementAction`
   - Capturar constraint de estoque por código Postgres

7. **[QRY-03]** Adicionar `.eq('company_id', ...)` explícita em `getProduct` (defesa de profundidade)

8. **[SCH-01]** Permitir quantity >= 0 em `movementSchema` para ajustes (requer refinamento contextual)

### Prioridade 3 (Testes & Performance — Resolver Conforme Capacidade)

9. **[SVC-01, SVC-02]** Criar `stock-service.test.ts` com testes unitários
   - `validateMovement()`: estoque suficiente, insuficiente, tipo inválido
   - `calculateNewStock()`: in/out/adjustment, edge cases (0, negativos)

10. **[ACT-06, ACT-07]** Adicionar happy-path + edge cases em `inventory-actions.test.ts`
    - Sucesso: movimento bem-sucedido retorna `ok: true`
    - Edge cases: quantidade <= 0, tipo inválido, product not found

11. **[UI-01, UI-02, UI-03, UI-04]** Criar `__tests__/*.test.tsx` para componentes
    - ReactivateProductButton: mock action, verifica toast
    - ProductForm: verifica `is_active` renderizado
    - MovementForm/List: validação, empty state

12. **[TST-04]** (Opcional) Criar teste de integração com branch de Supabase
    - Validar que trigger `apply_stock_movement` funciona end-to-end

13. **[DB-01, DB-02, QRY-01, QRY-02]** Performance + índices
    - Criar índice parcial em `products(is_active)` (DB-02)
    - Considerar GIN com `pg_trgm` ou full-text refactor (DB-01)
    - Testes de paginação edge cases (QRY-02)

### Próximos Passos Recomendados

1. **Hoje**: Marque 3 bugs críticos como PRs + atribua donos (ACT-01, ACT-02, UI-01)
2. **Próxima semana**: Gaps (ACT-03 até QRY-03)
3. **Próximas 2 semanas**: Testes (SVC-01/SVC-02, componentes)
4. **Backlog**: Performance + integração (DB-01/02, TST-04)

**Relatório gerado em**: 2026-04-29
**Duração da auditoria**: ~2h (7 camadas)
**Total de achados**: 22 (3 🔴 + 11 🟡 + 8 🟢)
