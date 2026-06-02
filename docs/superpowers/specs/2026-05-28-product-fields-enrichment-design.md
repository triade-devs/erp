# Design: Enriquecimento de Campos do Módulo de Produtos

**Data:** 2026-05-28
**Branch:** feat/product-fields-enrichment
**Status:** Implementado — 2026-06-02

---

## Contexto

O formulário atual de produtos possui: SKU, Nome, Descrição, Unidade, Estoque Mínimo, Preço de Custo e Preço de Venda. Esta spec propõe a adição de novos campos para atender demandas operacionais reais identificadas no uso do sistema: rastreabilidade de fornecedores, organização do catálogo por classificação hierárquica, identificação por código de barras, referência de localização física no estoque e classificação fiscal por NCM.

---

## Escopo

- Novos campos na tabela `products` (incluindo `ncm` — classificação fiscal obrigatória)
- Nova tabela `product_classifications` (hierarquia por empresa)
- Novo módulo `suppliers` (tabela + CRUD + permissões + menu)
- Utilitário de formatação de preço (`src/lib/price-formatter.ts`)
- Atualização do schema Zod e do componente `ProductForm`
- Validações a nível de input (UPPERCASE, limites de caracteres, inteiros)

---

## Seção 1 — Modelo de Dados

### Motivação

À medida que o catálogo de produtos cresce, surgem necessidades que vão além do cadastro básico. Produtos precisam ser associados a fornecedores para rastrear variações de preço e origem ao longo do tempo. A classificação hierárquica permite organizar e navegar o catálogo de forma estruturada. O código de barras EAN facilita a conferência de mercadorias na entrada do estoque. A localização física ajuda operadores a encontrar itens sem depender de memória. O NCM (Nomenclatura Comum do Mercosul) é a classificação fiscal obrigatória de cada mercadoria — base para emissão de nota fiscal, apuração de impostos e futura integração com serviços externos de consulta/validação fiscal.

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

| Campo               | Tipo    | Obrigatório | Observação                                                                    |
| ------------------- | ------- | ----------- | ----------------------------------------------------------------------------- |
| `barcode`           | text    | Não         | EAN-8 (8 dígitos) ou EAN-13 (13 dígitos), unique por empresa                  |
| `location`          | text    | Não         | UPPERCASE, max 40. Ex: "PRATELEIRA 3"                                         |
| `classification_id` | uuid FK | Não         | Aponta para o nível mais específico selecionado                               |
| `supplier_id`       | uuid FK | Sim         | NOT NULL — sistema ainda em desenvolvimento                                   |
| `ncm`               | text    | Sim         | NCM (8 dígitos), formato `XXXX.XX.XX`. NOT NULL — base para integração fiscal |

**Migration do NCM (NOT NULL em tabela existente):** como `products` já existe e `ncm` é obrigatório, a coluna é adicionada em três passos para não quebrar linhas antigas:

1. `alter table products add column ncm text;` (nullable)
2. `update products set ncm = '0000.00.00' where ncm is null;` (backfill com placeholder sentinela)
3. `alter table products alter column ncm set not null;`

O placeholder `0000.00.00` é um NCM inválido proposital: sinaliza produtos pré-existentes que precisam de correção manual (ou via futura integração de consulta fiscal).

**Ajustes em campos existentes:**

- `sku`: max 20 chars (era 32)
- `name`: UPPERCASE enforced, max 60 chars (era 120)
- `description`: obrigatória (era opcional), max 100 chars (era 2000)
- `min_stock`: inteiro apenas (era numeric)

---

## Seção 2 — Regras de Validação

### Motivação

Garantir consistência nos dados cadastrados é fundamental para que buscas, relatórios e integrações funcionem de forma confiável. Campos em UPPERCASE evitam duplicidades causadas por variações de caixa (ex: "coca-cola" vs "Coca-Cola" vs "COCA-COLA"). Limites de caracteres protegem o layout da interface e definem um padrão claro de preenchimento. A validação em dois níveis — input e Zod — garante feedback imediato ao usuário e segurança na camada de servidor.

### Input-level (componente React)

| Campo             | Comportamento                                                               |
| ----------------- | --------------------------------------------------------------------------- |
| SKU               | `toUpperCase()` em tempo real, bloqueia especiais exceto `-`, max 20        |
| Barcode           | Só dígitos, max 13                                                          |
| NCM               | Máscara `XXXX.XX.XX` — só dígitos, insere os pontos automaticamente, max 10 |
| Nome              | `toUpperCase()` em tempo real, max 60                                       |
| Descrição         | Livre, max 100                                                              |
| Localização       | `toUpperCase()` em tempo real, max 40                                       |
| Classificações    | `toUpperCase()` nos cadastros, selects encadeados no form                   |
| Estoque mínimo    | Só inteiros, sem decimais                                                   |
| Preço custo/venda | Formatador on-blur (ver Seção 3)                                            |

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
  ncm: z.string().regex(/^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$/, "NCM deve estar no formato XXXX.XX.XX"),
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

- SKU, Nome, Descrição, Unidade, Preço de Custo, Preço de Venda, Fornecedor, NCM
- Opcionais: Barcode, Classificações, Estoque Mínimo, Localização

---

## Seção 3 — Utilitário de Formatação de Preço

### Motivação

O campo de preço atual usa `type="number"` nativo do browser, que apresenta comportamento inconsistente entre sistemas operacionais e não oferece feedback visual formatado ao usuário. Um utilitário centralizado de formatação resolve dois problemas: padroniza a experiência de entrada de valores monetários em todo o projeto, e garante que o valor enviado ao banco esteja sempre no formato decimal correto independente do que o usuário digitou.

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

### Motivação

A relação entre produto e fornecedor é central para a gestão de estoque: um mesmo produto pode ser comprado de fornecedores diferentes ao longo do tempo, cada um com sua faixa de preço. Sem essa rastreabilidade, fica difícil analisar variações de custo, calcular margem por período ou identificar qual fornecedor oferece melhor condição. Criar o módulo de fornecedores como uma entidade própria — com CRUD dedicado, permissões e menu — garante que essa informação seja gerenciada de forma consistente e reutilizada em outros módulos futuros (compras, financeiro, relatórios).

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

### Motivação

Quando o catálogo de produtos cresce, uma lista plana se torna difícil de navegar e analisar. A classificação hierárquica em três níveis (Departamento → Categoria → Marca) permite organizar os produtos de forma que faça sentido para o negócio — seja uma distribuidora de alimentos, uma ferreteria ou um mercado. Por ser configurada por empresa, cada tenant define sua própria estrutura sem interferir nos demais. A ordenação da listagem de produtos por classificação é uma consequência direta: o usuário vê os produtos agrupados de forma lógica, facilitando conferências e análises de estoque.

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
- **Integração com serviço externo de consulta/validação de NCM** (evolução futura — possivelmente um serviço próprio). Esta spec entrega apenas o campo `ncm` com validação de formato; a consulta/autopreenchimento e a validação contra a tabela oficial da NCM serão tratadas em spec separada.
