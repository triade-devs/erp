---
name: erp-flow-manager
description: Use when answering questions about ERP user flows, validating a new feature against existing flows, checking required permissions for an action, or updating flow docs after code changes.
---

# ERP Flow Manager

Conhecimento vivo sobre todos os fluxos e interações do ERP Modular. Use esta skill para consultar, validar e manter a documentação de fluxos em sincronia com o código.

## Documentação de referência

| Arquivo                        | Conteúdo                                               |
| ------------------------------ | ------------------------------------------------------ |
| `docs/FLUXOS.md`               | Índice completo — todos os módulos, campos, permissões |
| `docs/flows/auth.md`           | Autenticação detalhada (login, cadastro, recuperação)  |
| `docs/flows/inventory.md`      | Estoque — produtos e movimentações                     |
| `docs/flows/knowledge-base.md` | Manual / Base de conhecimento                          |
| `docs/flows/tenancy.md`        | Empresas, configurações, company switcher              |
| `docs/flows/admin.md`          | Admin — empresas, roles, módulos, auditoria global     |
| `docs/flows/audit.md`          | Auditoria por empresa                                  |

**Regra:** leia `docs/FLUXOS.md` para visão geral. Leia o arquivo de detalhe do módulo quando precisar de campos exatos, validações ou comportamento de borda.

---

## Padrões não-óbvios (não pule esta seção)

### 1. Divisão de permissões Inventory vs Movements

Os produtos e movimentações são módulos _separados_ com permission codes distintos:

| Operação             | Permission code                               |
| -------------------- | --------------------------------------------- |
| CRUD de produto      | `inventory:product:create/update/delete/read` |
| CRUD de movimentação | `movements:movement:create/read`              |

> ⚠️ O menu e as páginas filtram pelo módulo respectivo — um usuário sem `movements:movement:read` não vê a rota de movimentações mesmo que tenha `inventory:product:read`.

### 2. Validação de estoque em duas camadas

Para movimentações de **saída** (`type: "out"`):

1. **TypeScript** (UX): `stock-service.ts` → `validateMovement()` verifica antes de inserir
2. **Database** (autoritativo): trigger `trg_apply_stock_movement` em `stock_movements` bloqueia com `raise exception 'Estoque insuficiente...'`

> Nunca escreva diretamente em `products.stock`. Use sempre `stock_movements`.

### 3. Hierarquia de roles (implícita)

Não existe campo `rank` ou `level`. A hierarquia é definida pelos permission codes concedidos:

```
platform_admin  → wildcard "*" (tabela separada — não é role de empresa)
owner           → tudo da empresa
manager         → operações sem configurações da empresa
operator        → movimentações básicas
```

`platform_admin` é uma flag global (`platform_admins` table), **não** uma membership de empresa.

### 4. Redirect de login

`signInAction` → sempre `/`. O layout `(dashboard)` então verifica membership: se o usuário não tem empresa ou empresa bloqueada, redireciona para `/sem-acesso`. O parâmetro `?redirect=` do middleware **não é consumido** pelo `signInAction`.

### 5. RLS é a camada autoritativa

`requirePermission()` no TypeScript é um guard de UX. **O RLS no Postgres é o que realmente protege os dados.** Se uma role não tem a permissão na tabela `role_permissions`, a query retorna 0 linhas silenciosamente.

---

## Validar uma implementação contra os fluxos

Ao implementar ou revisar uma feature, verifique o checklist abaixo:

### Checklist de Server Action

- [ ] Chama `requirePermission(companyId, 'modulo:recurso:operacao')` no início
- [ ] Valida input com schema Zod antes de qualquer I/O
- [ ] Retorna `ActionResult` (`{ ok: true }` ou `{ ok: false, message, fieldErrors? }`)
- [ ] Chama `revalidatePath` ao final em caso de sucesso
- [ ] Permission code está em `seed_core_permissions.sql` ou em migração posterior

### Checklist de RLS

- [ ] Existe migration que cria políticas `SELECT/INSERT/UPDATE/DELETE` para a nova tabela
- [ ] Existe migration que adiciona a permissão a todas as roles existentes (`ON CONFLICT DO NOTHING`)
- [ ] Testado que RLS retorna 0 linhas (não erro) quando permissão está ausente

### Checklist de UI

- [ ] Menu item em `menu.ts` filtrado pelo `permissionCode` correto
- [ ] Página faz `requirePermission` ou redireciona com mensagem amigável
- [ ] Formulário tem todos os campos documentados em `docs/flows/<modulo>.md`

---

## Atualizar docs após mudança de código

Quando um fluxo muda (novo campo, nova ação, nova permissão):

1. **Identifique** qual arquivo de detalhe cobria o fluxo (`docs/flows/<modulo>.md`)
2. **Atualize** o arquivo de detalhe com as novas informações
3. **Atualize** `docs/FLUXOS.md` se a mudança afeta o índice (novo módulo, nova rota, nova permissão)
4. **Commit** junto com o código da feature

> Não deixe docs desatualizados. Toda PR que muda um fluxo deve incluir a atualização do arquivo de detalhe correspondente.

---

## Canônico de referência por tipo

| O que precisar                          | Arquivo canônico                                               |
| --------------------------------------- | -------------------------------------------------------------- |
| Padrão de Server Action                 | `src/modules/inventory/actions/create-product.ts`              |
| Padrão de movimento com validação       | `src/modules/inventory/actions/register-movement.ts`           |
| Padrão de query server-only             | `src/modules/inventory/queries/list-products.ts`               |
| Padrão de formulário com useActionState | qualquer `*-form.tsx` em `src/modules/`                        |
| Permissões disponíveis                  | `supabase/migrations/20260420000007_seed_core_permissions.sql` |
| RLS de produto                          | `supabase/migrations/20260423000015_products_rls.sql`          |
| RLS de movimentação                     | `supabase/migrations/20260423000016_movements_rls.sql`         |
