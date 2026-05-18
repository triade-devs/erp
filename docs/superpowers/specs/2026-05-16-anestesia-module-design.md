# Módulo Anestesia — Design

**Data:** 2026-05-16  
**Última atualização:** 2026-05-18  
**Status:** Implementado (PR #41 — branch `feature/modulo-anestesia`)

---

## Problema e Objetivo

Criar um módulo `anestesia` no ERP para médicos anestesistas preencherem e imprimirem duas fichas clínicas complementares:

1. **Avaliação Pré-Anestésica** — anamnese, doenças/sintomas, exames laboratoriais, exame físico e classificação ASA.
2. **Ficha de Anestesia** — registro intraoperatório com grade de sinais vitais em intervalos de 15 minutos, técnica anestésica, vias aéreas, medicações e acessos vasculares.

**Fase inicial sem banco de dados** — persistência via `localStorage`. Banco de dados será adicionado em fase futura seguindo o padrão de migrações do ERP.

---

## Arquitetura

### Localização no projeto

- **Módulo:** `src/modules/anestesia/`
- **Rota:** `src/app/(dashboard)/[companySlug]/anestesia/page.tsx`
- **Navegação:** entrada em `src/core/navigation/menu.ts` com `requiresPermission: "anestesia:ficha:read"`

### Estrutura do módulo (implementada)

```
src/modules/anestesia/
├── components/
│   ├── anestesia-client-page.tsx       ← Client wrapper (state lifted aqui)
│   ├── anestesia-tabs.tsx              ← Tabs Shadcn + seletor de sessão no topo
│   ├── session-selector.tsx            ← lista/cria/apaga sessões do localStorage
│   ├── shared.tsx                      ← SectionCard, formInputClassName, compactInputClassName
│   ├── pre-avaliacao/
│   │   ├── pre-avaliacao-tab.tsx       ← Orquestra seções + useReactToPrint
│   │   ├── pre-avaliacao-print-layout.tsx ← Layout A4 dedicado para impressão (forwardRef)
│   │   ├── identificacao-section.tsx   ← nome, idade, sexo, clínica, registro, cirurgia
│   │   ├── doencas-section.tsx         ← 21 checkboxes de doenças/sintomas + comentários
│   │   ├── medicamentos-section.tsx    ← textarea medicamentos + radio jejum
│   │   ├── sinais-vitais-section.tsx   ← peso, altura, PA, temperatura + IMC calculado
│   │   ├── exames-section.tsx          ← Hb, VG, Leuc, Glic, Na, K e outros
│   │   ├── exame-fisico-section.tsx    ← Mallampati, SNC/Coluna, Resp/CV, VAD
│   │   └── conclusao-section.tsx       ← parecer clínico, ASA select, emergência, botão imprimir
│   └── ficha-anestesia/
│       ├── ficha-anestesia-tab.tsx     ← Orquestra seções + useReactToPrint
│       ├── ficha-anestesia-print-layout.tsx ← Layout A4 dedicado para impressão (forwardRef)
│       ├── dados-paciente-section.tsx  ← pré-populado da pré-avaliação + IMC no strip
│       ├── medicacao-tecnica-section.tsx ← ASA buttons, técnica, pré-med, tempos cirúrgicos
│       ├── ventilacao-section.tsx      ← 6 checkboxes de modo de ventilação
│       ├── via-aerea-section.tsx       ← checkboxes via aérea + detalhes IOT (cuff, dificuldade, tubo)
│       ├── vitals-grid.tsx             ← grade 12 slots × 5 séries (PA SIS/DIA/PAM/FC/FR) com gráfico SVG
│       │                                  + linhas adicionais: SpO2, Temp, Diurese, PVC, Ritmo
│       ├── acessos-section.tsx         ← 4 tipos de acesso vascular (Periférico, Intraósseo, Venoso Central, PAI)
│       ├── medicacoes-table.tsx        ← tabela dinâmica de ocorrências/medicações
│       ├── alertas-section.tsx         ← alergias, comentários, monitoração (Oximetria, ECG, PANI, Capnografia)
│       └── lab-results-section.tsx     ← gasometria/eletrólitos em tabela (pH, pCO2, pO2, bic/BE, K, Na, Gluc, Lact)
├── hooks/
│   ├── use-anestesia-session.ts        ← estado central + localStorage
│   └── use-print.ts                    ← legado, não mais utilizado (mantido para referência)
├── schemas/
│   ├── pre-avaliacao.ts                ← schema Zod para PreAvaliacaoData
│   └── ficha-anestesia.ts              ← schema Zod para FichaAnestesiaData
├── types/
│   ├── constants.ts                    ← DOENCA_KEYS, DOENCAS_OPTIONS, ASA_OPTIONS, etc.
│   ├── defaults.ts                     ← defaultPreAvaliacaoData, defaultFichaAnestesiaData
│   └── index.ts                        ← AnestesiaSession, PreAvaliacaoData, FichaAnestesiaData, etc.
├── utils/
│   ├── session.ts                      ← utilitários de sessão + cálculos de vitais + IMC
│   ├── storage.ts                      ← abstração sobre localStorage
│   └── __tests__/
│       ├── session.test.ts
│       └── storage.test.ts
└── index.ts                            ← barrel público
```

---

## Gerenciamento de Estado e Sessões

### Tipo central

```ts
type AnestesiaSession = {
  id: string; // "{paciente_slug}:{data}" ex: "Ricardo_Santos:2024-05-16"
  paciente: string;
  data: string; // ISO date "YYYY-MM-DD"
  preAvaliacao: PreAvaliacaoData;
  fichaAnestesia: FichaAnestesiaData;
  criadaEm: string; // ISO timestamp
  atualizadaEm: string; // ISO timestamp
};
```

### Hook `useAnestesiaSession`

Armazena `AnestesiaSession[]` em `localStorage["erp:anestesia:sessions"]`. Expõe:

- `sessions` — lista de sessões salvas
- `activeSession` — sessão corrente
- `createSession(paciente, data)` — cria nova sessão e ativa
- `setActiveSession(id)` — muda sessão ativa
- `updatePreAvaliacao(partial)` — atualiza com debounce de 500ms, salva no localStorage
- `updateFichaAnestesia(partial)` — idem
- `deleteSession(id)` — remove do localStorage

**Limite:** máximo 50 sessões (FIFO — remove a mais antiga ao criar a 51ª).

### Compartilhamento de dados entre abas

Ao abrir a aba "Ficha de Anestesia", os campos `paciente`, `peso`, `altura` e `PA` são pré-populados a partir de `session.preAvaliacao`. O strip de referência rápida exibe Peso, Altura, **IMC calculado**, PA e FC (primeiro slot de vitais).

---

## IMC — Cálculo em Tempo Real

O IMC (Índice de Massa Corporal) é calculado em tempo de execução a partir de `peso` e `altura` da Pré-Avaliação. **Não é armazenado** — é recalculado sempre que os valores mudam.

### Funções em `utils/session.ts`

```ts
calcularIMC(peso: string, altura: string): number | null
// Aceita altura em metros (1.70) ou centímetros (170).
// Retorna null se os valores forem inválidos/ausentes.

formatarIMC(imc: number | null): string
// Ex: 27.3 ou "—" se nulo

classificarIMC(imc: number | null): string
// Classificação OMS:
// < 18.5 → "Abaixo do peso"
// 18.5–24.9 → "Peso normal"
// 25–29.9 → "Sobrepeso"
// 30–34.9 → "Obesidade grau I"
// 35–39.9 → "Obesidade grau II"
// ≥ 40 → "Obesidade grau III"
```

### Onde aparece

| Local                                 | Comportamento                                                              |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `SinaisVitaisSection` (Pré-Avaliação) | Card IMC ao lado de Peso/Altura — atualiza em tempo real                   |
| `DadosPacienteSection` (Ficha)        | IMC no strip de referência rápida                                          |
| `PreAvaliacaoPrintLayout`             | Bloco destacado (bg-blue-50) na seção Sinais Vitais, com classificação OMS |
| `FichaAnestesiaPrintLayout`           | Campo IMC inline nos Dados do Paciente: `27.3 kg/m² · Sobrepeso`           |

---

## Impressão

### Abordagem: `react-to-print` (v3.3.0)

**Problema com `window.print()`:** o dashboard usa `div.grid.grid-cols-[240px_1fr]`. Ocultar a sidebar via CSS `@media print` não desaloca o espaço da coluna — o conteúdo impresso iniciava 240px à direita. Não havia como corrigir isso com CSS sem refatorar o layout inteiro.

**Solução:** `react-to-print` clona o componente de impressão em um **iframe isolado**, completamente separado do DOM do dashboard. Nenhuma regra CSS do layout pai interfere.

### Componentes de layout de impressão

Cada aba tem um componente dedicado de layout A4, renderizado fora da tela (`<div className="hidden">`), passado via `forwardRef` para o hook:

| Componente                  | Arquivo                                            |
| --------------------------- | -------------------------------------------------- |
| `PreAvaliacaoPrintLayout`   | `pre-avaliacao/pre-avaliacao-print-layout.tsx`     |
| `FichaAnestesiaPrintLayout` | `ficha-anestesia/ficha-anestesia-print-layout.tsx` |

### Configuração do hook

```ts
const handlePrint = useReactToPrint({
  contentRef: printRef,
  documentTitle: `Avaliação Pré-Anestésica — ${data.nomePaciente}`,
  pageStyle: `
    @page { size: A4 portrait; margin: 12mm 10mm; }
    body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  `,
});
```

### Conteúdo do layout da Pré-Avaliação

1. Cabeçalho: título + prontuário + data de emissão
2. Identificação do Paciente (grid 12 colunas)
3. Doenças ou Sintomas (8 cols) + Medicamentos em Uso / Sinais Vitais com IMC (4 cols)
4. Exames Complementares (largura total)
5. Exame Físico Específico (6 cols) + Conclusão & ASA (6 cols)
6. Área de assinatura

### Conteúdo do layout da Ficha de Anestesia

1. Cabeçalho: título + prontuário + data
2. Dados do Paciente (inclui Peso, Altura, IMC)
3. Técnica e Admissão (5 cols) + Via Aérea e Ventilação (4 cols) + Horários + Monitoração (3 cols)
4. Grade de Sinais Vitais — **tabela** com 12 slots de 15 min: PA SIS/DIA/PAM/FC/FR + SpO₂/Temp/Diurese/PVC/Ritmo
5. Acessos Vasculares (tabela)
6. Medicações/Ocorrências (7 cols) + Alertas/Exames Lab (5 cols)
7. Área de assinatura: Anestesiologista / CRM / Data

> **Nota sobre ícones:** os layouts de impressão **não usam** ícones Material Symbols. O motivo é que a fonte usa ligatures CSS — no iframe isolado do react-to-print a Google Fonts pode não terminar de carregar antes do print, fazendo os nomes dos ícones (ex: `monitor_heart`, `stethoscope`) aparecerem como texto inglês. Os títulos de seção são suficientes para o contexto de papel.

### `globals.css`

As regras `body.printing-*` foram **removidas** — não são mais necessárias. O `use-print.ts` permanece no repositório mas não é importado por nenhum componente ativo.

---

## Permissões

Dois códigos de permissão registrados via migração `supabase/migrations/20260516000041_anestesia_permissions.sql`:

| código                  | descrição                                |
| ----------------------- | ---------------------------------------- |
| `anestesia:ficha:read`  | Visualizar e acessar fichas de anestesia |
| `anestesia:ficha:write` | Preencher e editar fichas de anestesia   |

### Atribuição por role (na migração)

| role       | permissões       |
| ---------- | ---------------- |
| `owner`    | `read` + `write` |
| `manager`  | `read` + `write` |
| `operator` | apenas `read`    |

A migração também habilita o módulo `anestesia` para todas as empresas existentes via `INSERT INTO company_modules`.

> Segue o padrão descrito em CLAUDE.md: usa `r.code` (nunca UUIDs) e `ON CONFLICT DO NOTHING` para ser idempotente e cobrir empresas futuras.

---

## O que está fora do escopo desta fase

- Salvar fichas no banco de dados (Supabase)
- Múltiplos usuários compartilhando a mesma sessão em tempo real
- Assinatura digital
- Integração com dados de pacientes de outros módulos
- Export para PDF server-side
