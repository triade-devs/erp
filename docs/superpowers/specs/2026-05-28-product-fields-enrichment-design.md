# Design: Enriquecimento de Campos do Módulo de Produtos

**Data:** 2026-05-28
**Branch:** feat/product-fields-enrichment
**Status:** Aprovado — aguardando plano de implementação

---

## Contexto

O formulário atual de produtos possui: SKU, Nome, Descrição, Unidade, Estoque Mínimo, Preço de Custo e Preço de Venda. Esta spec adiciona campos que enriquecem o cadastro e estruturam a gestão de estoque: código de barras EAN, classificação hierárquica (Departamento → Categoria → Marca), fornecedor, localização física e um módulo completo de fornecedores.

---

## Escopo

- Novos campos na tabela `products`
- Nova tabela `product_classifications` (hierarquia por empresa)
- Novo módulo `suppliers` (tabela + CRUD + permissões + menu)
- Utilitário de formatação de preço (`src/lib/price-formatter.ts`)
- Atualização do schema Zod e do componente `ProductForm`
- Validações a nível de input (UPPERCASE, limites de caracteres, inteiros)

---

## Seção 1 — Modelo de Dados

### Tabela `product_classifications` (nova)

```sql
create table public.product_classifications (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,                          -- UPPERCASE, max 60
  level       text not null,                          -- 'department' | 'category' | 'brand'
  parent_id   uuid references public.product_classifications(id),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
```

**Regras de integridade:**

- `level = 'department'` → `parent_id` deve ser nulo
- `level = 'category'` → `parent_id` deve apontar para um registro com `level = 'department'`
- `level = 'brand'` → `parent_id` deve apontar para um registro com `level = 'category'`

Validadas via trigger ou check constraint na migration.

### Tabela `suppliers` (nova)

```sql
create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,                          -- UPPERCASE, max 80
  document    text,                                   -- CNPJ ou CPF, opcional
  phone       text,                                   -- max 20, opcional
  email       text,                                   -- email válido, opcional
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

### Alterações em `products`

| Campo               | Tipo    | Obrigatório | Observação                                                   |
| ------------------- | ------- | ----------- | ------------------------------------------------------------ |
| `barcode`           | text    | Não         | EAN-8 (8 dígitos) ou EAN-13 (13 dígitos), unique por empresa |
| `location`          | text    | Não         | UPPERCASE, max 40. Ex: "PRATELEIRA 3"                        |
| `classification_id` | uuid FK | Não         | Aponta para o nível mais específico selecionado              |
| `supplier_id`       | uuid FK | Sim         | NOT NULL — sistema ainda em desenvolvimento                  |

**Ajustes em campos existentes:**

- `sku`: max 20 chars (era 32)
- `name`: UPPERCASE enforced, max 60 chars (era 120)
- `description`: obrigatória (era opcional), max 100 chars (era 2000)
- `min_stock`: inteiro apenas (era numeric)

---

## Seção 2 — Regras de Validação

### Input-level (componente React)

| Campo             | Comportamento                                                        |
| ----------------- | -------------------------------------------------------------------- |
| SKU               | `toUpperCase()` em tempo real, bloqueia especiais exceto `-`, max 20 |
| Barcode           | Só dígitos, max 13                                                   |
| Nome              | `toUpperCase()` em tempo real, max 60                                |
| Descrição         | Livre, max 100                                                       |
| Localização       | `toUpperCase()` em tempo real, max 40                                |
| Classificações    | `toUpperCase()` nos cadastros, selects encadeados no form            |
| Estoque mínimo    | Só inteiros, sem decimais                                            |
| Preço custo/venda | Formatador on-blur (ver Seção 3)                                     |

### Schema Zod (`src/modules/inventory/schemas/index.ts`)

```ts
export const productSchema = z.object({
  sku: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9\-]+$/i),
  barcode: z
    .string()
    .regex(/^[0-9]{8}$|^[0-9]{13}$/)
    .optional(),
  name: z.string().min(2).max(60),
  description: z.string().min(1).max(100),
  unit: z.enum(["UN", "KG", "L", "CX", "M"]),
  costPrice: z.coerce.number().nonnegative(),
  salePrice: z.coerce.number().nonnegative(),
  minStock: z.coerce.number().int().nonnegative().default(0),
  supplierId: z.string().uuid(),
  classificationId: z.string().uuid().optional(),
  location: z.string().max(40).optional(),
  isActive: z.coerce.boolean().default(true),
});
```

**Campos obrigatórios no formulário:**

- SKU, Nome, Descrição, Unidade, Preço de Custo, Preço de Venda, Fornecedor
- Opcionais: Barcode, Classificações, Estoque Mínimo, Localização

---

## Seção 3 — Utilitário de Formatação de Preço

**Arquivo:** `src/lib/price-formatter.ts`

### Comportamento (on-blur)

O usuário digita livremente. Ao sair do campo (`onBlur`), o sistema formata:

- Sem `,` ou `.` na entrada → assume valor inteiro, adiciona `,00`
- Com `,` ou `.` → trata centavos conforme digitado

| Usuário digita | Exibe após blur |
| -------------- | --------------- |
| `15`           | `15,00`         |
| `1000`         | `1.000,00`      |
| `15,01`        | `15,01`         |
| `1500,50`      | `1.500,50`      |

### Valor salvo no banco

Sempre com `.` como separador decimal (padrão SQL):

| Exibição   | Banco     |
| ---------- | --------- |
| `15,00`    | `15.00`   |
| `1.000,00` | `1000.00` |
| `15,01`    | `15.01`   |

### API

```ts
// Formata string digitada para exibição — usado no onBlur
formatPriceDisplay(raw: string): string

// Converte valor exibido para decimal de banco "1000.00"
parsePriceToDecimal(display: string): string

// Hook para uso em componentes de formulário
usePriceInput(initialValue?: string): {
  displayValue: string       // valor exibido no input
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleBlur: () => void     // dispara formatação
  decimalValue: string       // "1000.00" — enviado no FormData hidden
}
```

---

## Seção 4 — Módulo de Fornecedores

### Estrutura de arquivos

```
src/modules/suppliers/
├── actions/
│   ├── create-supplier.ts
│   ├── update-supplier.ts
│   └── deactivate-supplier.ts
├── queries/
│   ├── list-suppliers.ts
│   └── get-supplier.ts
├── components/
│   ├── supplier-form.tsx
│   ├── supplier-table.tsx
│   └── supplier-quick-modal.tsx
├── schemas/index.ts
├── types/index.ts
└── index.ts
```

### Permissões

Migration junto com o módulo — atribuídas por `role.code`, não por UUID:

| Permissão                   | owner | manager | operator |
| --------------------------- | ----- | ------- | -------- |
| `suppliers:supplier:read`   | ✅    | ✅      | ✅       |
| `suppliers:supplier:create` | ✅    | ✅      | ❌       |
| `suppliers:supplier:update` | ✅    | ✅      | ❌       |
| `suppliers:supplier:delete` | ✅    | ❌      | ❌       |

### Registro no menu

```ts
// src/core/navigation/menu.ts
{ label: "Fornecedores", href: "/suppliers", icon: "truck",
  group: "Estoque", requiresSlug: true,
  requiresPermission: "suppliers:supplier:read" }
```

### Campos do formulário de fornecedor

| Campo    | Obrigatório | Validação         |
| -------- | ----------- | ----------------- |
| Nome     | Sim         | UPPERCASE, max 80 |
| CNPJ/CPF | Não         | Formato válido    |
| Telefone | Não         | max 20            |
| E-mail   | Não         | email válido      |

### Modal de cadastro rápido (`supplier-quick-modal.tsx`)

Aberto a partir do formulário de produto quando:

- Não há fornecedores cadastrados para a empresa
- Usuário clica em "Novo fornecedor" no select

Contém apenas **Nome** (obrigatório) e **CNPJ** (opcional). Ao salvar, fecha o modal e seleciona automaticamente o fornecedor criado no campo do produto.

---

## Seção 5 — Sistema de Classificação

### Hierarquia

```
Departamento (level: 'department', parent_id: null)
└── Categoria (level: 'category', parent_id → department)
    └── Marca (level: 'brand', parent_id → category)
```

### No formulário de produto

Três selects encadeados, todos opcionais:

1. **Departamento** — lista todos os departamentos da empresa
2. **Categoria** — carrega ao selecionar Departamento
3. **Marca** — carrega ao selecionar Categoria

O `classification_id` no produto aponta para o registro mais específico selecionado:

- Selecionou só Departamento → FK aponta para o departamento
- Selecionou até Categoria → FK aponta para a categoria
- Selecionou os 3 → FK aponta para a marca

### Ordenação na listagem de produtos

Com filtro por classificação: produtos agrupados por Departamento → Categoria → Marca.
Sem filtro: ordenação padrão por nome (comportamento atual mantido).

### Onde gerenciar

`/settings/classifications` — dentro das Configurações da empresa.
Não aparece no menu principal (é configuração de catálogo, não operacional).

---

## RLS

Todas as novas tabelas seguem o padrão do projeto:

- SELECT: `company_id IN (user_company_ids())`
- INSERT/UPDATE/DELETE: `has_permission(company_id, '<permission_code>')`
- `is_platform_admin()` bypassa todas as políticas

---

## Fora do escopo desta spec

- Interface de gestão de classificações em `/settings/classifications` (UI de CRUD das classificações — só a tabela e a FK no produto estão no escopo)
- Relatórios agrupados por fornecedor ou classificação
- Importação de produtos via CSV
- Integração com leitor de código de barras
