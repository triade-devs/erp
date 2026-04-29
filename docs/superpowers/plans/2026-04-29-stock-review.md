# Revisão Completa das Funções de Estoque — Plano de Execução

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auditar todas as camadas do módulo `inventory` nos 4 eixos (bugs, gaps, segurança, testes) e produzir um relatório de achados priorizados em `docs/superpowers/reports/stock-review-report.md`.

**Architecture:** Revisão sequencial por camada (migrations → schemas → services → actions → queries → components → tests). Cada layer é auditado individualmente; os achados são agregados no relatório final com severidade e correção sugerida. Nenhuma correção é aplicada durante a revisão.

**Tech Stack:** TypeScript · Next.js 15 Server Actions · Supabase (PostgreSQL + RLS + Triggers) · Zod · Vitest

---

## Mapa de arquivos auditados

| Camada        | Arquivos                                                                                                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migrations/DB | `supabase/migrations/20260420000002_products.sql` `20260420000003_stock_movements.sql` `20260423000011_products_company_nullable.sql` `20260423000013_sku_unique_per_company.sql` `20260423000014_products_company_not_null.sql` `20260423000015_products_rls.sql` `20260423000016_movements_rls.sql` |
| Schemas       | `src/modules/inventory/schemas/index.ts`                                                                                                                                                                                                                                                              |
| Services      | `src/modules/inventory/services/stock-service.ts`                                                                                                                                                                                                                                                     |
| Actions       | `src/modules/inventory/actions/create-product.ts` `update-product.ts` `delete-product.ts` `reactivate-product.ts` `register-movement.ts`                                                                                                                                                              |
| Queries       | `src/modules/inventory/queries/get-product.ts` `list-products.ts` `list-movements.ts`                                                                                                                                                                                                                 |
| Components    | `src/modules/inventory/components/product-form.tsx` `product-table.tsx` `movement-form.tsx` `movement-table.tsx` `reactivate-product-button.tsx`                                                                                                                                                      |
| Testes        | `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`                                                                                                                                                                                                                                   |

**Relatório de saída:** `docs/superpowers/reports/stock-review-report.md`

---

## Task 1: Criar esqueleto do relatório

**Files:**

- Create: `docs/superpowers/reports/stock-review-report.md`

- [ ] **Step 1: Criar o arquivo de relatório com a estrutura base**

```bash
mkdir -p docs/superpowers/reports
```

Criar `docs/superpowers/reports/stock-review-report.md` com o conteúdo abaixo (exatamente):

```markdown
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

_(a preencher na Task 2)_

## Camada 2: Schemas Zod

_(a preencher na Task 3)_

## Camada 3: Services

_(a preencher na Task 4)_

## Camada 4: Actions

_(a preencher na Task 5)_

## Camada 5: Queries

_(a preencher na Task 6)_

## Camada 6: UI Components

_(a preencher na Task 7)_

## Camada 7: Testes Existentes

_(a preencher na Task 8)_

---

## Sumário dos Achados

_(a preencher na Task 9)_

## Próximos Passos — Plano de Correções Priorizadas

_(a preencher na Task 9)_
```

- [ ] **Step 2: Commit do esqueleto**

```bash
git add docs/superpowers/reports/stock-review-report.md
git commit -m "docs(review): esqueleto do relatório de revisão do módulo inventory

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Auditar Camada 1 — Migrations / Banco de Dados

**Files:**

- Read: `supabase/migrations/20260420000002_products.sql`
- Read: `supabase/migrations/20260420000003_stock_movements.sql`
- Read: `supabase/migrations/20260423000011_products_company_nullable.sql`
- Read: `supabase/migrations/20260423000013_sku_unique_per_company.sql`
- Read: `supabase/migrations/20260423000014_products_company_not_null.sql`
- Read: `supabase/migrations/20260423000015_products_rls.sql`
- Read: `supabase/migrations/20260423000016_movements_rls.sql`
- Modify: `docs/superpowers/reports/stock-review-report.md`

- [ ] **Step 1: Ler todas as migrations relevantes**

```bash
cat supabase/migrations/20260420000002_products.sql
cat supabase/migrations/20260420000003_stock_movements.sql
cat supabase/migrations/20260423000011_products_company_nullable.sql
cat supabase/migrations/20260423000013_sku_unique_per_company.sql
cat supabase/migrations/20260423000014_products_company_not_null.sql
cat supabase/migrations/20260423000015_products_rls.sql
cat supabase/migrations/20260423000016_movements_rls.sql
```

- [ ] **Step 2: Preencher a seção "Camada 1" do relatório**

Substituir `_(a preencher na Task 2)_` por:

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/stock-review-report.md
git commit -m "docs(review): achados da camada migrations/DB

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Auditar Camada 2 — Schemas Zod

**Files:**

- Read: `src/modules/inventory/schemas/index.ts`
- Modify: `docs/superpowers/reports/stock-review-report.md`

- [ ] **Step 1: Ler o arquivo de schemas**

```bash
cat src/modules/inventory/schemas/index.ts
```

- [ ] **Step 2: Preencher a seção "Camada 2" do relatório**

Substituir `_(a preencher na Task 3)_` por:

```markdown
### Achados

**[SCH-01] 🟡 GAP — `movementSchema` bloqueia zeragem de estoque via ajuste**

- **Arquivo**: `src/modules/inventory/schemas/index.ts:24-28`
- **Detalhe**: `quantity: z.coerce.number().positive("Deve ser maior que zero")` — `positive()` exige `> 0`. Para o tipo `adjustment` (que define o saldo absoluto), pode ser necessário ajustar estoque para 0 (ex: inventário zerado, perda total). O schema bloqueia esse caso.
- **Correção sugerida**: Para `adjustment`, aceitar `quantity >= 0`. Isso requer validação contextual (refinamento Zod ou validação na action baseada no tipo).

### Verificações OK

- ✅ `productSchema`: todos os campos validados com limites razoáveis (SKU alfanumérico, nome 2-120 chars, unidades enum).
- ✅ `movementSchema`: `productId` validado como UUID; tipo restrito a `["in", "out", "adjustment"]`.
- ✅ `listProductsSchema` e `listMovementsSchema`: limites de página (`min: 1`, `max: 100`) e defaults seguros.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/stock-review-report.md
git commit -m "docs(review): achados da camada schemas Zod

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Auditar Camada 3 — Services

**Files:**

- Read: `src/modules/inventory/services/stock-service.ts`
- Modify: `docs/superpowers/reports/stock-review-report.md`

- [ ] **Step 1: Ler o arquivo de services**

```bash
cat src/modules/inventory/services/stock-service.ts
```

- [ ] **Step 2: Preencher a seção "Camada 3" do relatório**

Substituir `_(a preencher na Task 4)_` por:

```markdown
### Achados

**[SVC-01] 🟢 TEST — `validateMovement` e `calculateNewStock` sem cobertura de testes**

- **Arquivo**: `src/modules/inventory/services/stock-service.ts`
- **Detalhe**: Nenhum teste unitário para essas duas funções. `validateMovement` tem branch para `type === "out"`, mas nenhuma cobertura do happy path, do erro lançado, nem do comportamento para `in` e `adjustment`. `calculateNewStock` não é testado em nenhum caso.
- **Correção sugerida**: Criar `src/modules/inventory/services/__tests__/stock-service.test.ts` com casos: (a) `validateMovement` tipo `out` com estoque suficiente — sem erro; (b) `validateMovement` tipo `out` com estoque insuficiente — lança `InsufficientStockError`; (c) `validateMovement` tipos `in`/`adjustment` — sempre passa; (d) `calculateNewStock` para os 3 tipos.

**[SVC-02] 🟢 GAP — `calculateNewStock` pode retornar negativo sem aviso**

- **Arquivo**: `src/modules/inventory/services/stock-service.ts:23-36`
- **Detalhe**: Se chamado para tipo `out` sem chamar `validateMovement` antes (e.g. diretamente na UI para preview), `calculateNewStock` retorna valor negativo silenciosamente. Não é um bug crítico (é usado só para preview), mas pode exibir saldo negativo na UI.
- **Correção sugerida**: Documentar explicitamente que o retorno pode ser negativo e que a validação é responsabilidade do chamador.

### Verificações OK

- ✅ `validateMovement` cobre corretamente o único caso de pré-validação necessário (`out` > stock).
- ✅ `InsufficientStockError` extends `Error` corretamente, com `name` explícito.
- ✅ `calculateNewStock` cobre os 3 tipos de movimento com lógica correta.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/stock-review-report.md
git commit -m "docs(review): achados da camada services

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Auditar Camada 4 — Actions

**Files:**

- Read: `src/modules/inventory/actions/create-product.ts`
- Read: `src/modules/inventory/actions/update-product.ts`
- Read: `src/modules/inventory/actions/delete-product.ts`
- Read: `src/modules/inventory/actions/reactivate-product.ts`
- Read: `src/modules/inventory/actions/register-movement.ts`
- Modify: `docs/superpowers/reports/stock-review-report.md`

- [ ] **Step 1: Ler todas as actions**

```bash
cat src/modules/inventory/actions/create-product.ts
cat src/modules/inventory/actions/update-product.ts
cat src/modules/inventory/actions/delete-product.ts
cat src/modules/inventory/actions/reactivate-product.ts
cat src/modules/inventory/actions/register-movement.ts
```

- [ ] **Step 2: Preencher a seção "Camada 4" do relatório**

Substituir `_(a preencher na Task 5)_` por:

```markdown
### Achados

**[ACT-01] 🔴 BUG — `reactivateProductAction` usa permissão de delete**

- **Arquivo**: `src/modules/inventory/actions/reactivate-product.ts:22`
- **Detalhe**: `await requirePermission(companyId, "inventory:product:delete")` — usa a mesma permissão do soft-delete. Reativar e desativar são operações distintas. Um operador sem permissão de delete não consegue reativar produtos. Semanticamente errado e viola o princípio de menor privilégio.
- **Correção sugerida**: Usar `"inventory:product:update"` (reativar é uma atualização de `is_active`) ou criar permissão dedicada `"inventory:product:reactivate"` e registrá-la em `20260420000007_seed_core_permissions.sql`.

**[ACT-02] 🔴 BUG — `updateProductAction` reseta `is_active` para `true` ao editar produto inativo**

- **Arquivo**: `src/modules/inventory/actions/update-product.ts:47` + `src/modules/inventory/schemas/index.ts:17`
- **Detalhe**: O `productSchema` tem `isActive: z.coerce.boolean().default(true)`. O `ProductForm` não renderiza input para `isActive`, então `FormData` nunca contém esse campo. `z.coerce.boolean().default(true)` com campo ausente retorna `true`. Logo, `updateProductAction` sempre faz `is_active = true`, reativando silenciosamente qualquer produto inativo que seja editado.
- **Correção sugerida**: Em `updateProductAction`, não sobrescrever `is_active` se o campo não estiver presente no FormData. Opção mais limpa: criar `updateProductSchema` separado que omite `isActive` (ou o torna explicitamente opcional sem default).

**[ACT-03] 🟡 GAP — `updateProductAction` retorna `ok: true` quando produto não existe**

- **Arquivo**: `src/modules/inventory/actions/update-product.ts:37-58`
- **Detalhe**: O `.update().eq("id", id).eq("company_id", companyId)` pode afetar 0 rows (produto não encontrado ou de outra empresa) sem erro — o Supabase retorna `{ error: null, count: 0 }`. A action retorna `{ ok: true, message: "Produto atualizado com sucesso" }` mesmo sem nada ter sido atualizado.
- **Correção sugerida**: Verificar `count === 0` após o update e retornar `{ ok: false, message: "Produto não encontrado" }`.

**[ACT-04] 🟡 GAP — `deleteProductAction` retorna silenciosamente quando produto não existe**

- **Arquivo**: `src/modules/inventory/actions/delete-product.ts:34-42`
- **Detalhe**: Mesmo problema do ACT-03: soft-delete de produto inexistente/de outra empresa não gera erro, mas o `redirect()` ainda redireciona o usuário normalmente.
- **Correção sugerida**: Verificar `count === 0` e retornar erro antes de chamar `redirect()`.

**[ACT-05] 🔵 SEC — Detecção de erro do trigger via string matching frágil**

- **Arquivo**: `src/modules/inventory/actions/register-movement.ts:66`
- **Detalhe**: `if (error.message.includes("Estoque insuficiente"))` — se a mensagem do trigger mudar na migration (ex: tradução, refatoração), essa condição deixa de funcionar silenciosamente, expondo a mensagem técnica do Postgres ao usuário.
- **Correção sugerida**: Usar código de erro Postgres. Erros levantados por `RAISE EXCEPTION` ficam em `error.code === "P0001"` (raise_exception). Checar `error.code === "P0001"` em vez da mensagem de texto.

**[ACT-06] 🟢 TEST — `reactivateProductAction` sem nenhum teste**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: Única action sem cobertura alguma — nem de permissão, nem de happy path.
- **Correção sugerida**: Adicionar suite de testes cobrindo: (a) bloqueio sem empresa ativa; (b) bloqueio por ForbiddenError; (c) happy path com reativação bem-sucedida.

**[ACT-07] 🟢 TEST — Ausência de happy-path tests para todas as actions**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: A suite cobre apenas isolamento de permissão (ForbiddenError + empresa). Não há teste que verifique o caminho feliz: create retorna `ok: true`, insert é chamado com os dados corretos, `revalidatePath` é chamado após sucesso.
- **Correção sugerida**: Adicionar pelo menos um happy-path test por action.

### Verificações OK

- ✅ Todas as actions verificam autenticação (`getUser`) e empresa ativa antes de continuar.
- ✅ Todas as actions chamam `requirePermission` antes de operar no banco.
- ✅ `createProductAction` e `updateProductAction` tratam `23505` (SKU duplicado).
- ✅ `registerMovementAction` faz pré-validação de saldo + captura erro do trigger.
- ✅ Soft-delete em `deleteProductAction` preserva histórico de movimentações (não viola FK).
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/stock-review-report.md
git commit -m "docs(review): achados da camada actions

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Auditar Camada 5 — Queries

**Files:**

- Read: `src/modules/inventory/queries/get-product.ts`
- Read: `src/modules/inventory/queries/list-products.ts`
- Read: `src/modules/inventory/queries/list-movements.ts`
- Modify: `docs/superpowers/reports/stock-review-report.md`

- [ ] **Step 1: Ler todas as queries**

```bash
cat src/modules/inventory/queries/get-product.ts
cat src/modules/inventory/queries/list-products.ts
cat src/modules/inventory/queries/list-movements.ts
```

- [ ] **Step 2: Preencher a seção "Camada 5" do relatório**

Substituir `_(a preencher na Task 6)_` por:

```markdown
### Achados

**[QRY-01] 🟡 GAP — `getProduct` mascara todos os erros como `null`**

- **Arquivo**: `src/modules/inventory/queries/get-product.ts:12-13`
- **Detalhe**: `if (error) return null` — retorna `null` tanto para "produto não encontrado" (PostgREST code `PGRST116`) quanto para falhas de rede, timeout ou erro de RLS. O caller não consegue distinguir "produto não existe" de "erro de sistema". Uma página de detalhe de produto pode renderizar "não encontrado" mesmo quando o problema é uma falha de conexão.
- **Correção sugerida**: Verificar `error.code === "PGRST116"` para "not found" e relançar (`throw error`) para os demais.

**[QRY-02] 🟡 GAP — `listMovements` sem filtros por data, tipo ou responsável**

- **Arquivo**: `src/modules/inventory/queries/list-movements.ts`
- **Detalhe**: Suporta apenas filtro por `productId`. Casos de uso comuns — "movimentações de entrada hoje", "ajustes feitos pelo usuário X", "saídas do último mês" — não são suportados.
- **Correção sugerida**: Adicionar ao `listMovementsSchema` campos opcionais `movementType`, `startDate`, `endDate`, `performedBy` e construir a query dinamicamente.

**[QRY-03] 🟢 TEST — Nenhum teste para as queries**

- **Arquivo**: `src/modules/inventory/queries/`
- **Detalhe**: `getProduct`, `listProducts` e `listMovements` não têm nenhum teste. Como são server-only, precisariam de mock do Supabase client (mesmo padrão das actions) ou de testes de integração.
- **Correção sugerida**: Criar `src/modules/inventory/queries/__tests__/` com testes para: (a) `getProduct` produto encontrado; (b) `getProduct` não encontrado; (c) `listProducts` paginação correta; (d) `listMovements` filtro por `productId`.

### Verificações OK

- ✅ Todas as queries começam com `import "server-only"`.
- ✅ `listProducts` e `listMovements` recebem `companyId` explicitamente e isolam por empresa.
- ✅ Paginação implementada corretamente com `range(from, to)` e `count: "exact"`.
- ✅ `listProducts` suporta busca por `name` e `sku` simultaneamente com `ilike`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/stock-review-report.md
git commit -m "docs(review): achados da camada queries

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 7: Auditar Camada 6 — UI Components

**Files:**

- Read: `src/modules/inventory/components/product-form.tsx`
- Read: `src/modules/inventory/components/product-table.tsx`
- Read: `src/modules/inventory/components/movement-form.tsx`
- Read: `src/modules/inventory/components/movement-table.tsx`
- Read: `src/modules/inventory/components/reactivate-product-button.tsx`
- Modify: `docs/superpowers/reports/stock-review-report.md`

- [ ] **Step 1: Ler todos os componentes**

```bash
cat src/modules/inventory/components/product-form.tsx
cat src/modules/inventory/components/product-table.tsx
cat src/modules/inventory/components/movement-form.tsx
cat src/modules/inventory/components/movement-table.tsx
cat src/modules/inventory/components/reactivate-product-button.tsx
```

- [ ] **Step 2: Preencher a seção "Camada 6" do relatório**

Substituir `_(a preencher na Task 7)_` por:

```markdown
### Achados

**[UI-01] 🔴 BUG — `ReactivateProductButton` ignora resultado da action (sem feedback de erro)**

- **Arquivo**: `src/modules/inventory/components/reactivate-product-button.tsx:20-24`
- **Detalhe**: O callback `onClick` chama `await onReactivate(productId)` mas nunca usa o `ActionResult` retornado. Se a reativação falhar (erro de rede, permissão negada), o usuário não recebe nenhum feedback — o botão simplesmente volta ao estado normal, sem mensagem de erro.
- **Correção sugerida**: Verificar `result.ok` e usar `toast.error(result.message)` em caso de falha (mesmo padrão do `MovementForm` e `ProductForm`).

**[UI-02] 🟡 GAP — Saldo do produto no `MovementForm` fica desatualizado após registrar movimentação**

- **Arquivo**: `src/modules/inventory/components/movement-form.tsx:48-55`
- **Detalhe**: A lista de produtos com seus saldos é renderizada server-side no carregamento da página. Após registrar uma movimentação (que reseta o form via `formKey`), o saldo exibido no dropdown continua sendo o do carregamento original — não reflete a movimentação recém-registrada.
- **Correção sugerida**: `revalidatePath` no server action já invalida o cache, mas o `MovementForm` recebe `products` como prop estática. Para atualizar o saldo, a lista de produtos deve ser refetched — o mais simples é fazer o form estar numa Server Component que re-renderiza, ou usar router refresh client-side após sucesso.

**[UI-03] 🟡 GAP — `MovementTable` não exibe quem realizou a movimentação**

- **Arquivo**: `src/modules/inventory/components/movement-table.tsx`
- **Detalhe**: A coluna `performed_by` (UUID do usuário) existe na tabela `stock_movements` mas não é exibida na tabela. Para auditoria e rastreabilidade em um ERP, saber quem fez cada movimentação é essencial.
- **Correção sugerida**: Adicionar join com `profiles(name)` na query `listMovements` e exibir o nome do usuário na tabela.

**[UI-04] 🟡 GAP — `ProductForm` não permite editar o status `is_active` do produto**

- **Arquivo**: `src/modules/inventory/components/product-form.tsx`
- **Detalhe**: O form de edição não renderiza nenhum input para `isActive`. O usuário não consegue desativar um produto pelo form de edição — só pelo botão de delete (soft-delete). Embora o design atual seja intencional, não está documentado e pode causar confusão.
- **Correção sugerida**: Documentar o design intencional ou adicionar um campo `isActive` explícito no form de edição para tornar o comportamento transparente.

### Verificações OK

- ✅ `MovementForm` e `ProductForm` usam `useActionState` (API correta do React 19 / Next.js 15).
- ✅ `MovementForm` reseta o form após sucesso via `formKey` + `useState`.
- ✅ Feedback visual com `toast.success/error` no `MovementForm` e `ProductForm`.
- ✅ `aria-invalid` nos inputs com erro para acessibilidade.
- ✅ `ProductTable`: badge de estoque baixo quando `stock <= min_stock`.
- ✅ `MovementTable`: tipos de movimento com badges coloridos (entrada/saída/ajuste).
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/stock-review-report.md
git commit -m "docs(review): achados da camada UI components

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 8: Auditar Camada 7 — Testes Existentes

**Files:**

- Read: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- Modify: `docs/superpowers/reports/stock-review-report.md`

- [ ] **Step 1: Ler o arquivo de testes e verificar cobertura**

```bash
cat src/modules/inventory/actions/__tests__/inventory-actions.test.ts
```

Também executar os testes para confirmar que passam:

```bash
npx vitest run src/modules/inventory/actions/__tests__/inventory-actions.test.ts
```

Saída esperada: todos os testes passam (12 testes em 4 suites).

- [ ] **Step 2: Preencher a seção "Camada 7" do relatório**

Substituir `_(a preencher na Task 8)_` por:

```markdown
### Cobertura Atual

| Suite                                            | Testes | Cobertura                                                |
| ------------------------------------------------ | ------ | -------------------------------------------------------- |
| `createProductAction — isolamento por empresa`   | 4      | Permissão negada, empresa nula, empresa B≠A, Zod invalid |
| `updateProductAction — controle de permissão`    | 2      | Permissão negada, permissão correta                      |
| `deleteProductAction — controle de permissão`    | 2      | Permissão negada, permissão correta                      |
| `registerMovementAction — controle de permissão` | 3      | Permissão negada, permissão correta, empresa nula        |
| `reactivateProductAction`                        | **0**  | **Sem cobertura**                                        |

### Achados

**[TST-01] 🟢 TEST — `reactivateProductAction` sem nenhum teste (listado também em ACT-06)**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: Única action completamente fora da suite.
- **Correção sugerida**: Ver ACT-06.

**[TST-02] 🟢 TEST — Ausência de happy-path tests para todas as actions**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: Nenhum teste verifica: (a) insert/update/delete é chamado com os dados corretos; (b) `revalidatePath` é chamado após sucesso; (c) a action retorna `{ ok: true }` com a mensagem correta.
- **Correção sugerida**: Ver ACT-07.

**[TST-03] 🟢 TEST — Caminho de erro do trigger não testado**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: Não há teste que simule o insert retornando `{ error: { message: "Estoque insuficiente..." } }` para verificar se a action retorna a mensagem correta de erro ao usuário.
- **Correção sugerida**: Adicionar caso de teste em `registerMovementAction` com `insertError = { message: "Estoque insuficiente para o produto X" }` e verificar que `result.message` contém o texto esperado.

**[TST-04] 🟢 TEST — `out` com estoque insuficiente (pré-check UX) não testado**

- **Arquivo**: `src/modules/inventory/actions/__tests__/inventory-actions.test.ts`
- **Detalhe**: `registerMovementAction` com `type: "out"` e `quantity > stockValue` deve retornar `{ ok: false }` antes de chamar insert. Não há teste para esse cenário.
- **Correção sugerida**: Adicionar caso com `type: "out", quantity: "150"` e `stockValue: 100` e verificar que `result.ok === false` e `insert` não foi chamado.

**[TST-05] 🟢 TEST — Nenhum teste unitário para `stock-service.ts`**

- **Arquivo**: `src/modules/inventory/services/` — sem diretório `__tests__/`
- **Detalhe**: Ver SVC-01.

### Verificações OK

- ✅ Mocks bem estruturados com `vi.mock` e cleanup via `beforeEach(() => vi.clearAllMocks())`.
- ✅ `ForbiddenError` mockada corretamente como classe com propriedade `permission`.
- ✅ `makeSupabaseMock` é extensível e cobre os cenários de permissão testados.
- ✅ Constantes de UUID (`COMPANY_A`, `COMPANY_B`, `PRODUCT_UUID`) evitam magic strings.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/reports/stock-review-report.md
git commit -m "docs(review): achados da camada testes existentes

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 9: Consolidar relatório e escrever Próximos Passos

**Files:**

- Modify: `docs/superpowers/reports/stock-review-report.md`

- [ ] **Step 1: Substituir a seção "Sumário dos Achados"**

Substituir `_(a preencher na Task 9)_` (na seção Sumário) por:

```markdown
| ID     | Eixo | Severidade | Descrição breve                                                                |
| ------ | ---- | ---------- | ------------------------------------------------------------------------------ |
| ACT-01 | BUG  | 🔴 Alta    | `reactivateProductAction` usa permissão `delete` em vez de `update`            |
| ACT-02 | BUG  | 🔴 Alta    | `updateProductAction` reseta `is_active` para `true` ao editar produto inativo |
| UI-01  | BUG  | 🔴 Alta    | `ReactivateProductButton` ignora resultado da action — sem feedback de erro    |
| ACT-05 | SEC  | 🔵 Alta    | Detecção de erro do trigger por `string.includes()` frágil — usar `error.code` |
| ACT-03 | GAP  | 🟡 Média   | `updateProductAction` retorna `ok: true` quando produto não existe (0 rows)    |
| ACT-04 | GAP  | 🟡 Média   | `deleteProductAction` retorna `ok: true` quando produto não existe (0 rows)    |
| SCH-01 | GAP  | 🟡 Média   | `movementSchema` bloqueia zeragem de estoque via ajuste (`quantity = 0`)       |
| QRY-01 | GAP  | 🟡 Média   | `getProduct` mascara todos os erros como `null` — não distingue "not found"    |
| QRY-02 | GAP  | 🟡 Média   | `listMovements` sem filtros por data, tipo ou responsável                      |
| UI-02  | GAP  | 🟡 Média   | Saldo no dropdown do `MovementForm` desatualizado após registrar movimentação  |
| UI-03  | GAP  | 🟡 Média   | `MovementTable` não exibe quem realizou a movimentação (`performed_by`)        |
| UI-04  | GAP  | 🟡 Média   | `ProductForm` não permite editar `is_active` — comportamento não documentado   |
| SVC-01 | TEST | 🟢 Baixa   | `validateMovement` e `calculateNewStock` sem cobertura de testes               |
| SVC-02 | GAP  | 🟢 Baixa   | `calculateNewStock` pode retornar valor negativo sem aviso                     |
| ACT-06 | TEST | 🟢 Baixa   | `reactivateProductAction` sem nenhum teste                                     |
| ACT-07 | TEST | 🟢 Baixa   | Ausência de happy-path tests para todas as actions                             |
| TST-03 | TEST | 🟢 Baixa   | Propagação de erro do trigger não testada                                      |
| TST-04 | TEST | 🟢 Baixa   | Saída com estoque insuficiente (pré-check) não testada                         |
| QRY-03 | TEST | 🟢 Baixa   | Nenhum teste para as queries                                                   |
| DB-01  | TEST | 🟢 Baixa   | Índice GIN de full-text não utilizado pela query (`ilike`)                     |
| DB-02  | TEST | 🟢 Baixa   | Sem índice em `products.is_active`                                             |
| DB-03  | GAP  | 🟢 Baixa   | Policy `products_delete` nunca ativada (soft-delete via update)                |

**Total: 3 bugs 🔴 · 8 gaps 🟡 · 11 melhorias 🟢**
```

- [ ] **Step 2: Substituir a seção "Próximos Passos"**

Substituir `_(a preencher na Task 9)_` (na seção Próximos Passos) por:

```markdown
Ordenado por impacto e risco. Cada item é uma task atômica independente.

### 🔴 Prioridade 1 — Bugs ativos (corrigir antes de qualquer nova feature)

1. **[ACT-01]** Corrigir permissão em `reactivateProductAction`: trocar `inventory:product:delete` por `inventory:product:update` em `src/modules/inventory/actions/reactivate-product.ts:22`.

2. **[ACT-02]** Corrigir reset silencioso de `is_active` no update: criar `updateProductSchema` sem o campo `isActive`, ou remover `isActive` do payload de update em `update-product.ts:40-47`.

3. **[UI-01]** Corrigir `ReactivateProductButton` para tratar o `ActionResult`: verificar `result.ok` e exibir `toast.error(result.message)` em caso de falha.

4. **[ACT-05]** Substituir string matching frágil em `register-movement.ts:66` por `error.code === "P0001"`.

### 🟡 Prioridade 2 — Gaps funcionais relevantes

5. **[ACT-03]** Verificar `count === 0` em `updateProductAction` e retornar `{ ok: false, message: "Produto não encontrado" }`.

6. **[ACT-04]** Verificar `count === 0` em `deleteProductAction` antes de chamar `redirect()`.

7. **[QRY-01]** Distinguir "not found" de erro de sistema em `getProduct`: checar `error.code === "PGRST116"` antes de retornar `null`.

8. **[SCH-01]** Permitir `quantity = 0` para `adjustment` em `movementSchema` (validação contextual por tipo).

9. **[UI-02]** Resolver saldo desatualizado no `MovementForm` — usar `router.refresh()` client-side após sucesso ou garantir que a Server Component pai re-renderize.

10. **[QRY-02]** Adicionar filtros `movementType`, `startDate`, `endDate`, `performedBy` em `listMovements` e `listMovementsSchema`.

11. **[UI-03]** Exibir nome do responsável em `MovementTable` — adicionar join `profiles(name)` em `listMovements`.

### 🟢 Prioridade 3 — Cobertura de testes e qualidade

12. **[SVC-01/TST-04/TST-03]** Criar `src/modules/inventory/services/__tests__/stock-service.test.ts` com casos unitários para `validateMovement` e `calculateNewStock`.

13. **[ACT-06/ACT-07]** Expandir `inventory-actions.test.ts`: adicionar suite para `reactivateProductAction` e happy-path tests para todas as 5 actions.

14. **[QRY-03]** Criar `src/modules/inventory/queries/__tests__/` com testes mockados para as 3 queries.

15. **[DB-01]** Avaliar adoção de `pg_trgm` + índice GIN trigram em vez do índice GIN full-text (ou remover o índice não utilizado).

16. **[DB-02]** Adicionar `CREATE INDEX idx_products_is_active ON products(is_active) WHERE is_active = false`.

17. **[DB-03/UI-04]** Documentar o design de soft-delete e o comportamento de `is_active` no `ProductForm`.
```

- [ ] **Step 3: Commit final**

```bash
git add docs/superpowers/reports/stock-review-report.md
git commit -m "docs(review): relatório completo de revisão do módulo inventory

22 achados: 3 bugs críticos, 8 gaps funcionais, 11 melhorias de qualidade/testes

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 10: Verificação final

- [ ] **Step 1: Confirmar que o relatório está completo**

```bash
cat docs/superpowers/reports/stock-review-report.md | grep "a preencher"
```

Saída esperada: nenhuma linha (todos os placeholders substituídos).

- [ ] **Step 2: Verificar histórico de commits**

```bash
git --no-pager log --oneline -10
```

Saída esperada: 9 commits de review (esqueleto + 7 camadas + consolidação).

- [ ] **Step 3: Reportar ao usuário**

O relatório está em `docs/superpowers/reports/stock-review-report.md` com:

- 22 achados documentados
- 3 bugs 🔴 (reativação com permissão errada, reset silencioso de is_active, botão sem feedback)
- 8 gaps 🟡 (rows afetados não verificados, zeragem bloqueada, queries sem filtros, etc.)
- 11 melhorias 🟢 (cobertura de testes, índices, documentação)

Perguntar ao usuário se deseja iniciar um plano de correções (`writing-plans`) para as prioridades 1 e 2.
