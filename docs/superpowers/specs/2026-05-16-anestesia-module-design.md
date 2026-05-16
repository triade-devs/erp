# Módulo Anestesia — Design

**Data:** 2026-05-16  
**Status:** Aprovado

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

### Estrutura do módulo

```
src/modules/anestesia/
├── components/
│   ├── anestesia-tabs.tsx              ← tabs + seletor de sessão no topo
│   ├── session-selector.tsx            ← lista/cria/apaga sessões do localStorage
│   ├── pre-avaliacao/
│   │   ├── identificacao-section.tsx   ← nome, idade, sexo, clínica, registro, cirurgia
│   │   ├── doencas-section.tsx         ← 21 checkboxes de doenças/sintomas + comentários
│   │   ├── medicamentos-section.tsx    ← textarea medicamentos + radio jejum
│   │   ├── sinais-vitais-section.tsx   ← peso, altura, PA, temperatura
│   │   ├── exames-section.tsx          ← Hb, VG, Leuc, Glic, Na, K e outros
│   │   ├── exame-fisico-section.tsx    ← Mallampati, SNC/Coluna, Resp/CV, VAD
│   │   └── conclusao-section.tsx       ← parecer clínico, ASA select, emergência, assinatura
│   └── ficha-anestesia/
│       ├── dados-paciente-section.tsx  ← pré-populado da pré-avaliação (editável)
│       ├── medicacao-tecnica-section.tsx ← ASA buttons, técnica, pré-med, tempos cirúrgicos
│       ├── ventilacao-section.tsx      ← 6 checkboxes de modo de ventilação
│       ├── via-aerea-section.tsx       ← checkboxes via aérea + detalhes IOT
│       ├── vitals-grid.tsx             ← grade 12 colunas × 7 linhas (PA, FC, FR, SpO2, Temp, Diurese, PVC, Ritmo)
│       ├── acessos-section.tsx         ← 4 tipos de acesso vascular (calibre + local)
│       ├── medicacoes-table.tsx        ← tabela dinâmica de ocorrências/medicações
│       ├── alertas-section.tsx         ← alergias, comentários, monitoração ativa
│       └── lab-results-section.tsx     ← gasometria/eletrólitos em tabela
├── hooks/
│   ├── use-anestesia-session.ts        ← estado central + localStorage
│   └── use-print.ts                    ← window.print() + classe printing
├── schemas/
│   ├── pre-avaliacao.ts                ← tipos Zod para PreAvaliacaoData
│   └── ficha-anestesia.ts              ← tipos Zod para FichaAnestesiaData
├── types/
│   └── index.ts                        ← AnestesiaSession e tipos derivados
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

Ao abrir a aba "Ficha de Anestesia", os campos `paciente`, `peso`, `altura` e `PA` são pré-populados a partir de `session.preAvaliacao`. Os campos são editáveis na ficha caso o médico precise ajustar durante o procedimento.

---

## Impressão

- Cada aba tem um botão "Imprimir Ficha" que chama `window.print()`.
- O hook `usePrint` aplica a classe `printing-pre-avaliacao` ou `printing-ficha-anestesia` no `<body>` antes de imprimir e remove após.
- CSS `@media print` em `globals.css` (com seletor por classe):
  - Oculta: sidebar, header, `session-selector`, botões de ação
  - Garante layout A4, quebra de página entre seções longas
  - Força cores visíveis (sem backgrounds escuros)

---

## Permissões

Dois códigos de permissão novos:

| código                  | descrição                     |
| ----------------------- | ----------------------------- |
| `anestesia:ficha:read`  | Visualizar e acessar o módulo |
| `anestesia:ficha:write` | Preencher e editar fichas     |

**Sem migração de banco de dados nesta fase.** Um platform admin deve atribuir manualmente as permissões ao role desejado via painel `/admin/platform/roles`.

> Quando o módulo receber suporte a banco de dados, uma migração seguirá o padrão `supabase/migrations/` com `INSERT INTO permissions` e `INSERT INTO role_permissions` por `r.code`, conforme documentado em CLAUDE.md.

---

## O que está fora do escopo desta fase

- Salvar fichas no banco de dados (Supabase)
- Múltiplos usuários compartilhando a mesma sessão
- Assinatura digital
- Integração com dados de pacientes de outros módulos
- Export para PDF server-side
