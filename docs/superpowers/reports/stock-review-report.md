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
