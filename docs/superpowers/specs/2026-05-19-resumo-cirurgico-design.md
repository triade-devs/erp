# Resumo Cirúrgico — Design

**Data:** 2026-05-19
**Status:** Aprovado — aguardando implementação
**Branch:** `feature/modulo-anestesia` (PR #41)

---

## Problema e Objetivo

O módulo de anestesia já possui impressão individual para a Avaliação Pré-Anestésica e para a Ficha de Anestesia (intraoperatória). Falta um documento consolidado de **referência rápida para o centro cirúrgico**: uma única folha A4 que reúne os dados mais relevantes das duas fichas, com destaque visual para informações críticas (VAD, ASA, emergência, alergias).

---

## Decisões de Design

| Pergunta               | Decisão                                                           |
| ---------------------- | ----------------------------------------------------------------- | ---------------- |
| Propósito              | Referência rápida para a equipe do centro cirúrgico               |
| Grade de sinais vitais | **Omitida** — disponível apenas na Ficha de Anestesia             |
| Limite de páginas      | **Máximo 1 página A4** — campos vazios são omitidos               |
| Ponto de acesso na UI  | **Nova aba "Resumo"** no `AnestesiaTabs`, ao lado das duas fichas |
| Layout                 | **Alertas em destaque + 2 colunas** (pré-avaliação                | intraoperatório) |

---

## Arquitetura

### Novos arquivos

```
src/modules/anestesia/components/resumo/
├── resumo-tab.tsx            ← aba com botão "Imprimir Resumo" e referência ao layout
└── resumo-print-layout.tsx   ← layout A4, forwardRef, mesmo padrão dos outros layouts
```

### Arquivos modificados

- `src/modules/anestesia/components/anestesia-tabs.tsx` — adiciona a 3ª aba "Resumo"

### Sem novos serviços, hooks, tipos ou migrações

O `resumo-print-layout.tsx` recebe `{ preAvaliacao: PreAvaliacaoData, fichaAnestesia: FichaAnestesiaData }` e renderiza diretamente, reutilizando funções já existentes (`calcularIMC`, `formatarIMC`, `classificarIMC`, `calcularPesoPredito`, `formatarPesoPredito`).

O `resumo-tab.tsx` usa `useReactToPrint` diretamente (sem criar um novo hook), seguindo o padrão de `pre-avaliacao-tab.tsx` e `ficha-anestesia-tab.tsx`.

---

## Layout do `resumo-print-layout.tsx`

### Props

```typescript
type Props = {
  preAvaliacao: PreAvaliacaoData;
  fichaAnestesia: FichaAnestesiaData;
};
```

### Estrutura visual (de cima para baixo)

#### 1. Cabeçalho (full width, fundo `#1e3a5f`)

| Campo             | Fonte                             |
| ----------------- | --------------------------------- |
| Nome do paciente  | `preAvaliacao.nomePaciente`       |
| Cirurgia proposta | `preAvaliacao.cirurgiaProposta`   |
| Clínica           | `preAvaliacao.clinica`            |
| Registro          | `preAvaliacao.registro`           |
| Anestesiologista  | `fichaAnestesia.anestesiologista` |
| Data              | `fichaAnestesia.data`             |

#### 2. Faixa de alertas críticos (renderizada condicionalmente)

Cada badge só aparece se a condição for verdadeira:

| Badge               | Cor                               | Condição                                                                   |
| ------------------- | --------------------------------- | -------------------------------------------------------------------------- |
| ⚠ Via Aérea Difícil | Vermelho (`red-100/red-500`)      | `preAvaliacao.suspeitaVAD === true`                                        |
| ASA `{valor}`       | Amarelo (`yellow-100/yellow-600`) | `fichaAnestesia.asaStatus` ou `preAvaliacao.asa` não vazio                 |
| 🚨 Emergência       | Vermelho                          | `fichaAnestesia.emergencia === true` ou `preAvaliacao.emergencia === true` |
| Alergia: `{texto}`  | Laranja (`orange-100/orange-600`) | `fichaAnestesia.alergias` não vazio                                        |

Se nenhum alerta for aplicável, a faixa inteira é omitida.

#### 3. Duas colunas em `grid-template-columns: 1fr 1fr`

##### Coluna esquerda — Pré-Avaliação

Cada sub-seção só renderiza se tiver conteúdo relevante:

1. **Identificação** — idade, sexo (sempre renderiza se nome estiver presente)
2. **Doenças Positivas** — filtra `Object.entries(preAvaliacao.doencas)` por `value === true`, exibe como badges; omite seção se nenhuma marcada. Inclui `comentariosDoencas` se preenchido.
3. **Medicamentos** — `medicamentosEmUso` + `jejumOrientado` (Sim/Não); omite se `medicamentosEmUso` vazio e `jejumOrientado === null`.
4. **Sinais Vitais** — peso, altura, PA, temperatura, IMC calculado + classificação, Peso Predito (fórmula de Devine); omite campos individuais se vazios.
5. **Exames** — mostra apenas os campos preenchidos (Hb, VG, Leuc, Glic, Na, K, outrosExames); omite seção se todos vazios.
6. **Exame Físico** — Mallampati, cabeça/pescoço, SNC/coluna, resp/CV; omite seção se todos vazios. Se `suspeitaVAD`, inclui condutas VAD com destaque vermelho.
7. **Parecer Clínico** — `parecerClinico`; omite se vazio.

##### Coluna direita — Intraoperatório

1. **Dados gerais** — cirurgião, estado de admissão, horários (início/término anestesia e cirurgia); omite campos individuais se vazios.
2. **Técnica · Ventilação · Via Aérea** — exibe como badges apenas os `true`; se `viaAerea.iot === true`, exibe detalhes de IOT (cuff, dificuldade, tubo); omite seção se nenhum marcado.
3. **Monitoração** — badges dos itens marcados (`oximetria`, `ecg`, `pani`, `capnografia`); omite se nenhum.
4. **Acessos Vasculares** — apenas os com `ativo === true`; omite seção se nenhum ativo.
5. **Medicações** — tabela compacta (descrição, hora, via) de `fichaAnestesia.medicacoes`; omite se array vazio.
6. **Comentários Adicionais** — `fichaAnestesia.comentariosAdicionais`; omite se vazio.
7. **Gasometria** — tabela compacta de `fichaAnestesia.labResults`; omite seção se array vazio.

#### 4. Rodapé — Assinatura (full width)

Linha de assinatura do anestesiologista + data, igual ao padrão dos outros layouts.

---

## Regras de renderização

- **Campos vazios são omitidos** — `value === ""` ou `undefined` não renderiza o campo individual.
- **Seções sem conteúdo são omitidas** — se todos os campos de uma sub-seção estiverem vazios/falsos, a `SectionCard` inteira não renderiza.
- **Sem paginação** — o layout não tem `page-break`; se o conteúdo exceder 1 página, o `@media print` do CSS global cuida da quebra natural. O objetivo de design é caber em 1 página para fichas típicas.

---

## `resumo-tab.tsx`

Estrutura simples:

```tsx
"use client";

export function ResumoTab({
  preAvaliacao,
  fichaAnestesia,
}: {
  preAvaliacao: PreAvaliacaoData;
  fichaAnestesia: FichaAnestesiaData;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Resumo Cirúrgico",
    pageStyle: `
      @page { size: A4 portrait; margin: 12mm 10mm; }
      body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `,
  });

  return (
    <>
      {/* Área visível na tela: descrição + botão */}
      <div className="flex flex-col items-center gap-4 py-10 text-center text-muted-foreground">
        <p>
          Resumo consolidado para o centro cirúrgico. Inclui dados críticos das duas fichas em uma
          página A4.
        </p>
        <Button onClick={handlePrint}>Imprimir Resumo</Button>
      </div>

      {/* Layout oculto na tela — usado pelo react-to-print */}
      <div className="hidden">
        <ResumoPrintLayout
          ref={printRef}
          preAvaliacao={preAvaliacao}
          fichaAnestesia={fichaAnestesia}
        />
      </div>
    </>
  );
}
```

---

## Mudança em `anestesia-tabs.tsx`

Adicionar a 3ª aba `value="resumo"` com label "Resumo" após "Ficha de Anestesia". O `ResumoTab` recebe `preAvaliacao` e `fichaAnestesia` diretamente de `activeSession`:

```tsx
<TabsTrigger value="resumo">Resumo</TabsTrigger>
// ...
<TabsContent value="resumo">
  <ResumoTab
    preAvaliacao={activeSession.preAvaliacao}
    fichaAnestesia={activeSession.fichaAnestesia}
  />
</TabsContent>
```

---

## Testes

Não há funções puras novas para testar unitariamente. A lógica de filtragem (doenças positivas, campos preenchidos, alertas) é puramente declarativa dentro do componente. Testes de componente/snapshot ficam para fase futura.

---

## Fora do escopo

- Pré-visualização do resumo na tela (o tab pode mostrar uma mensagem simples + botão imprimir)
- Gasometria com gráfico
- Seleção de quais seções incluir no resumo
- Tradução/internacionalização
