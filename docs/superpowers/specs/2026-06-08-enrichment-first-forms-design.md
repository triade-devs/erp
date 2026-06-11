# Forms enrichment-first: Fornecedores e Produtos

> Data: 2026-06-08
> Repos afetados: `enrichment-services` (provider) e `erp` (consumer)

## Contexto e problema

Os serviços de enriquecimento (`enrichment-services`) normalizam respostas de
BrasilAPI (CNPJ), ViaCEP (CEP), Siscomex (NCM) e Open Food Facts (EAN) e o ERP os
consome de forma **não-bloqueante** (toda falha vira `null`; o usuário preenche
manualmente). A análise em `enrichment-services/docs/comparacao-rotas.md` mostrou que
o provider **descarta campos que os forms precisam** e tem um **bug de validação**:

- 🐛 `isActive` (empresa) compara `situacao_cadastral` (número) com a string `"ATIVA"`
  → sempre `false`.
- 🟡 `cep`, `ddd_telefone_1`, `email` da BrasilAPI não são expostos (mas têm coluna em
  `suppliers` e campo no form).
- 🟡 `quantity` do Open Food Facts é descartado (útil para nome/unidade/descrição).
- ➕ Rota `GET /ncm/:codigo` (valida código) existe mas nunca é consumida.

Objetivo: refatorar os dois forms para um fluxo **enrichment-first** (documento/EAN
como primeiro campo, cascateando o autopreenchimento) e completar o contrato de
resposta do provider.

## Decisões (acordadas no brainstorming)

| Tema                     | Decisão                                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| Entrega                  | **Um spec, implementação em 3 fases** (provider → fornecedores → produtos) |
| Arquitetura provider     | Estender tipos de resposta de forma **aditiva** (campos novos, sem quebra) |
| Descrição do produto     | `categories + quantity` (OFF não retorna `description`)                    |
| Unidade do produto       | **Heurística por sufixo** do `quantity`                                    |
| Cidade/estado fornecedor | CNPJ preenche o CEP → **CEP dispara ViaCEP** que deriva cidade/estado      |
| NCM inválido             | **Só avisa** (não bloqueia o save — resiliente a serviço offline)          |

Sem migrations: `cep`/`phone`/`email` (suppliers) e `unit` (products) já existem.

---

## Fase 1 — Provider (`enrichment-services`)

### 1.1 Bug `isActive`

`buildEmpresaResponse` (`src/routes/empresa/router.ts`) passa a derivar de
`descricao_situacao_cadastral`:

```ts
isActive: String(p.descricao_situacao_cadastral ?? "").toUpperCase() === "ATIVA",
```

### 1.2 `EmpresaResponse` — campos aditivos

```ts
export type EmpresaResponse = {
  cnpj;
  name;
  tradeName;
  city;
  state;
  country;
  isActive; // existentes
  cep: string; // de `cep`            → só dígitos
  phone: string; // de `ddd_telefone_1` → só dígitos (DDD + número)
  email: string; // de `email`          → "" quando null
};
```

`buildEmpresaResponse` mapeia os novos campos (normaliza CEP/phone com
`String(...).replace(/\D/g, "")`; email com `String(p.email ?? "")`).

### 1.3 `BarcodeResponse` — campo `quantity`

```ts
export type BarcodeResponse = { ean; name; brand; category; quantity: string };
```

`buildBarcodeResponse` lê `p.quantity` (`String(p.quantity ?? "")`).

### 1.4 NCM

Sem mudança no provider. `GET /ncm/:codigo` já retorna `404` para inexistente —
será consumido pelo ERP para validação.

### 1.5 Testes (provider)

- `buildEmpresaResponse`: `isActive` true/false pela `descricao_situacao_cadastral`;
  presença de `cep`/`phone`/`email` normalizados; `email` vazio quando `null`.
- `buildBarcodeResponse`: `quantity` presente; vazio quando ausente.

---

## Fase 2 — Consumer: form de **Fornecedores**

Arquivos: `src/lib/enrichment-client.ts`,
`src/modules/suppliers/components/supplier-form.tsx`.

### 2.1 Client

`EmpresaData` e `CepData` ganham os campos novos (`cep`, `phone`, `email` em
`EmpresaData`). `lookupEmpresa`/`lookupCep` inalterados na assinatura.

### 2.2 Reordenação dos campos

`País` (default Brasil, compacto) → **`Documento/CNPJ`** → `Nome` → `CEP` →
`Estado` → `Cidade` → `Telefone` → `E-mail`.

### 2.3 Fluxo de autopreenchimento (ao completar 14 dígitos do CNPJ)

1. `lookupEmpresa(cnpj)` preenche: **Nome** (`name`), **Telefone** (`phone`),
   **E-mail** (`email`), **CEP** (`cep`), badge Ativa/Inativa (`isActive`).
2. O CEP preenchido **dispara `lookupCep`** → preenche **Cidade** (`city`) e
   **Estado** (`state`) — fonte única de endereço.
3. Fallback: se ViaCEP falhar, usa `city`/`state` que o CNPJ já trouxe.
4. Tudo não-bloqueante; só preenche campo vazio? **Não** — autofill por CNPJ
   sobrescreve (é uma consulta deliberada do usuário). Campos manuais editáveis depois.

### 2.4 Mudanças técnicas

`Telefone` e `E-mail` hoje são não-controlados (`defaultValue`). Serão levantados
para estado controlado no `SupplierForm` (igual `name`/`city`/`state`), para permitir
o autofill. `PhoneField` recebe o número via prop controlada; mantém a máscara BR.

---

## Fase 3 — Consumer: form de **Produtos**

Arquivos: `src/lib/enrichment-client.ts`,
`src/modules/inventory/components/product-form.tsx`.

### 3.1 Client

`BarcodeData` ganha `quantity`. Novo `lookupNcm(codigo): Promise<NcmItem | null>`
chamando `/api/enrich/ncm?codigo=...` (o Route Handler já suporta o branch `codigo`).

### 3.2 Reordenação dos campos

**`Código de barras`** → `SKU` → `NCM` → `Nome` → `Descrição` → `Unidade` → resto.

### 3.3 Fluxo ao completar o EAN (8 ou 13 dígitos)

1. **Nome** = `product_name + brands + quantity`, upper, máx. 60.
2. **Descrição** = `categories + quantity` (junta com `·`, máx. 100).
3. **Unidade** = heurística sobre `quantity` (case-insensitive, **avaliada nesta
   ordem** — a primeira que casar vence, porque "6 x 1 L" casaria com `x` e `l`):
   1. contém `x` entre números (multipack, ex. "6 x 1 L") → `CX`
   2. contém `kg` ou termina em `g` (ex. "395 g") → `KG`
   3. contém `ml` ou termina em `l` (ex. "1 L", "500 ml") → `L`
   4. senão → `UN`
4. Mantém regra atual: **só sugere em campo vazio** (não sobrescreve digitação).

### 3.4 Validação de NCM

Ao ter NCM completo (8 dígitos), chama `lookupNcm(codigo)` e mostra badge no padrão
do badge de situação do CNPJ:

- encontrado → **"NCM válido"** (secondary)
- `null`/404 → **"NCM não encontrado"** (destructive/warning)
- **Não bloqueia o submit** (serviço pode estar offline).

### 3.5 Testes (ERP)

- Unit: parser de `quantity` → unidade (cobrir g/kg/ml/l/multipack/desconhecido).
- `inventory-actions.test.ts` e `suppliers-actions.test.ts` **não mockam** o
  enrichment-client (verificado) — ficam inalterados; apenas rodar a suíte para
  confirmar que nada quebrou.

---

## Resumo de arquivos tocados

**`enrichment-services`**

- `src/types.ts` — `EmpresaResponse` (+cep/phone/email), `BarcodeResponse` (+quantity)
- `src/routes/empresa/router.ts` — fix `isActive` + map novos campos
- `src/routes/barcode/router.ts` — map `quantity`
- `src/__tests__/routes.test.ts` — novos casos

**`erp`**

- `src/lib/enrichment-client.ts` — tipos novos + `lookupNcm`
- `src/modules/suppliers/components/supplier-form.tsx` — reorder + autofill + controlados
- `src/modules/inventory/components/product-form.tsx` — reorder + autofill + heurística + validação NCM
- util de heurística de unidade (`quantity-parser`) + teste unit novo

## Não-objetivos (YAGNI)

- Não expor `street`/`neighborhood`/`logradouro`/`bairro` (sem coluna em `suppliers`).
- Não usar `image_url`/`nutriscore`/`category→classificação` do OFF nesta entrega.
- Não montar descrição hierárquica de NCM (níveis pais).
