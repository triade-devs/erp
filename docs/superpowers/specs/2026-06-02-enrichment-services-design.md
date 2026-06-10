# Design: Serviços de Enriquecimento de Dados

**Data:** 2026-06-02
**Status:** Aprovado — aguardando implementação
**Repositório alvo:** projeto separado (monorepo `enrichment-services/` ou repositório próprio)

---

## Contexto

O ERP possui formulários de produto e fornecedor com campos que podem ser preenchidos automaticamente a partir de fontes externas públicas. O objetivo é reduzir erros de digitação e acelerar o cadastro através de autocomplete não-bloqueante — o usuário sempre pode editar os valores sugeridos antes de salvar.

**Princípio central:** esses serviços são **somente leitura**. Nenhum dado é persistido no Supabase do ERP. São proxies de lookup puro.

---

## Arquitetura

```
ERP (Next.js)
  │
  ├─ produto: campo NCM    → GET ms-ncm/ncm/busca?q=
  ├─ produto: campo EAN    → GET ms-barcode/barcode/:ean
  ├─ fornecedor: CNPJ      → GET ms-empresa/empresa/:cnpj
  ├─ fornecedor: CEP       → GET ms-cep/cep/:cep
  └─ empresa (settings): CNPJ + CEP → mesmos serviços
```

**Stack:** Node.js + TypeScript em todos os serviços.
**Deploy:** Render free tier (1 instância por serviço).
**Keep-alive:** GitHub Actions pingando `GET /health` de cada serviço a cada 13 minutos para evitar o sleep do Render após 15 min de inatividade.
**Cache:** memória (Map<key, { data, cachedAt }>) com TTL por serviço. Perdido no sleep/restart — aceitável, pois as fontes são públicas e sem custo de rebuild.

---

## Serviço 1 — ms-ncm

### Fonte

Siscomex / Receita Federal:
`https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json`

Sem token. Sem cadastro. Oficial.

### Comportamento

- No startup, faz o download da nomenclatura vigente e carrega em memória (~15k registros, ~3MB).
- Cron interno (node-cron) sincroniza diariamente à meia-noite.
- Buscas por código parcial ou por palavras da descrição.

### Rotas

```
GET /health
  → { status: "ok", records: 15234, lastSync: "2026-06-02T00:00:00Z" }

GET /ncm/busca?q=8517
  → { results: [{ code: "8517.12.31", description: "Telefones para redes celulares..." }, ...] }
  → Máximo 10 resultados. Busca por prefixo de código OU substring na descrição.

GET /ncm/:codigo
  → { code: "8517.12.31", description: "Telefones para redes celulares e para outras redes sem fio" }
  → 404 se não encontrado
```

### Uso no ERP — produto form

- Ao digitar no campo NCM (após 4 dígitos), chama `/ncm/busca?q=` e exibe dropdown de sugestões.
- Ao selecionar um NCM, preenche o campo NCM **e** sugere a descrição do NCM no campo **Descrição** do produto (usuário pode editar).
- Ao sair do campo NCM com valor completo (`XXXX.XX.XX`), valida via `/ncm/:codigo` — exibe erro inline se inválido.

---

## Serviço 2 — ms-empresa

### Fonte

API pública de CNPJ (sem token, sem cadastro).
Endpoints candidatos (avaliar na implementação pelo uptime/latência):

- `https://publica.cnpj.ws/cnpj/:cnpj`
- `https://receitaws.com.br/v1/cnpj/:cnpj`

### Comportamento

- Lookup sob demanda por CNPJ (14 dígitos, sem formatação).
- Cache em memória: TTL 24h. Sem persistência — rebuild automático após sleep.

### Rotas

```
GET /health
  → { status: "ok" }

GET /empresa/:cnpj
  → {
      cnpj: "12345678000195",
      name: "EMPRESA LTDA",           // razão social
      tradeName: "Empresa",           // nome fantasia
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      isActive: true                  // situação cadastral ativa
    }
  → 404 se CNPJ não encontrado
  → 422 se CNPJ inválido (formato)
```

### Uso no ERP — fornecedor form + settings/empresa

- Ao completar o campo CNPJ (18 chars com máscara `XX.XXX.XXX/XXXX-XX`), dispara a busca automaticamente.
- Preenche: **Nome** do fornecedor (ou empresa), **Cidade**, **Estado**, **País**.
- Exibe badge "Situação: Ativa/Inativa" next ao campo CNPJ como informação adicional (não salvo).
- Se a empresa estiver inativa, exibe aviso amarelo — mas não bloqueia o cadastro.

---

## Serviço 3 — ms-cep

### Fonte

ViaCEP: `https://viacep.com.br/ws/:cep/json/`
Sem token. Sem cadastro. Cobertura nacional.

### Comportamento

- Lookup sob demanda por CEP (8 dígitos, sem hífen).
- Cache em memória: TTL 7 dias (dados de CEP mudam raramente).

### Rotas

```
GET /health
  → { status: "ok" }

GET /cep/:cep
  → {
      cep: "01310-100",
      city: "São Paulo",
      state: "SP",
      country: "Brasil"
    }
  → 404 se CEP não encontrado
  → 422 se CEP inválido (formato)
```

> **Nota de escopo:** CEP não preenche rua nem bairro. A precisão do CEP no Brasil varia (alguns cobrem bairros inteiros, outros uma rua específica) — não confiável o suficiente para auto-preencher esses campos.

### Uso no ERP — fornecedor form + settings/empresa

- Campo **CEP** adicionado ao formulário de fornecedor (entre Estado e Cidade) e ao formulário de empresa em settings.
- Ao completar o CEP (9 chars com máscara `XXXXX-XXX`), dispara a busca.
- Preenche: **Cidade**, **Estado**, **País**.
- CEP é salvo no banco? **Sim para fornecedor** (campo já existe na migration, adicionar se necessário). **Verificar se empresa já tem o campo.**

---

## Serviço 4 — ms-barcode

### Fonte primária

Open Food Facts: `https://world.openfoodfacts.org/api/v0/product/:ean.json`
Sem token. Cobertura: principalmente alimentos.

### Fonte secundária (fallback)

Alternativa pública a definir na implementação (avaliar uptime).

### Comportamento

- Lookup sob demanda por EAN-8 ou EAN-13.
- Cache em memória: TTL 7 dias.
- Se a fonte primária não retornar resultado, tenta o fallback.
- Se nenhuma fonte retornar, devolve 404 limpo (sem erro de servidor).

### Rotas

```
GET /health
  → { status: "ok" }

GET /barcode/:ean
  → {
      ean: "7891234567890",
      name: "Produto X",
      brand: "Marca Y",
      category: "Alimentos"
    }
  → 404 se EAN não encontrado em nenhuma fonte
  → 422 se EAN inválido (não é EAN-8 nem EAN-13)
```

### Uso no ERP — produto form

- Ao completar o campo EAN (8 ou 13 dígitos), dispara a busca automaticamente.
- Preenche com sugestão: **Nome** do produto, **Descrição** (usando `name + brand` como base, editável).
- Se 404, nenhuma ação — usuário preenche manualmente.

---

## Padrão de resposta de erro

Todos os serviços seguem o mesmo envelope de erro:

```json
{ "error": "NOT_FOUND", "message": "CNPJ não encontrado" }
{ "error": "INVALID_FORMAT", "message": "CEP deve ter 8 dígitos" }
{ "error": "UPSTREAM_UNAVAILABLE", "message": "Fonte externa indisponível" }
```

HTTP status codes: 200 OK, 404 Not Found, 422 Unprocessable Entity, 503 Service Unavailable.

---

## Comportamento no ERP durante falha

Se um serviço estiver offline (cold start prolongado, falha da fonte externa):

- O campo continua editável manualmente.
- Nenhuma mensagem de erro exibida ao usuário — o autocomplete simplesmente não dispara.
- O formulário não é bloqueado.

---

## Mudanças no ERP (formulários)

| Formulário         | Campo adicionado | Observação                                                   |
| ------------------ | ---------------- | ------------------------------------------------------------ |
| Produto            | —                | NCM já existe; EAN já existe; integração só no comportamento |
| Fornecedor         | `cep`            | Novo campo, nova migration se não existir                    |
| Settings / Empresa | `cep`            | Verificar se já existe; adicionar se não                     |

---

## Fora do escopo desta spec

- Validação de dígito verificador de CNPJ/CPF (só consulta à API)
- Persistência de qualquer dado dos serviços no Supabase
- Interface de administração dos serviços
- Rate limiting avançado (free tier das APIs é suficiente para o volume atual)
- Autenticação entre ERP e serviços (interno, aceitar apenas origens conhecidas como evolução futura)
