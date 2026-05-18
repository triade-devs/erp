# Peso Predito — Sinais Vitais Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o campo Peso Predito (fórmula de Devine) como card calculado na seção de Sinais Vitais da pré-avaliação anestésica.

**Architecture:** Duas funções puras adicionadas a `utils/session.ts` (`calcularPesoPredito` + `formatarPesoPredito`), testadas por TDD antes de qualquer toque no componente. O componente `sinais-vitais-section.tsx` consome as funções e renderiza um card somente-leitura idêntico em estilo ao card de IMC já existente.

**Tech Stack:** TypeScript, React 19, Vitest, Tailwind + Shadcn/UI.

---

## Mapa de arquivos

| Arquivo                                                                    | Ação      | Responsabilidade                                        |
| -------------------------------------------------------------------------- | --------- | ------------------------------------------------------- |
| `src/modules/anestesia/utils/session.ts`                                   | Modificar | Adicionar `calcularPesoPredito` e `formatarPesoPredito` |
| `src/modules/anestesia/utils/__tests__/session.test.ts`                    | Modificar | Testes das novas funções                                |
| `src/modules/anestesia/components/pre-avaliacao/sinais-vitais-section.tsx` | Modificar | Renderizar card de Peso Predito                         |

---

## Task 1: Funções de cálculo e formatação (TDD)

**Files:**

- Modify: `src/modules/anestesia/utils/__tests__/session.test.ts`
- Modify: `src/modules/anestesia/utils/session.ts`

---

- [ ] **Step 1: Escrever os testes que vão falhar**

Adicione o bloco a seguir ao final de `src/modules/anestesia/utils/__tests__/session.test.ts`, após o último `describe`:

```ts
import {
  buildSessionId,
  buildVitalsSlots,
  createAnestesiaSession,
  insertSessionWithLimit,
  syncVitalsWithStartHour,
  updateSessionFichaAnestesia,
  updateSessionPreAvaliacao,
  getVitalsChartY,
  buildVitalsSeriesPath,
  calcularPesoPredito,
  formatarPesoPredito,
} from "../session";
```

> ⚠️ Apenas adicione `calcularPesoPredito` e `formatarPesoPredito` ao import existente no topo do arquivo — não duplique o import.

Depois adicione ao final do arquivo:

```ts
describe("calcularPesoPredito", () => {
  it("masculino com altura em metros retorna valor correto", () => {
    // PP = 50 + 0.91 × (170 - 152.4) = 50 + 16.016 = 66.016
    const result = calcularPesoPredito("1.70", "M");
    expect(result).toBeCloseTo(66.016, 2);
  });

  it("feminino com altura em centímetros retorna valor correto", () => {
    // PP = 45.5 + 0.91 × (165 - 152.4) = 45.5 + 11.466 = 56.966
    const result = calcularPesoPredito("165", "F");
    expect(result).toBeCloseTo(56.966, 2);
  });

  it("masculino com altura em centímetros retorna valor correto", () => {
    // PP = 50 + 0.91 × (180 - 152.4) = 50 + 25.116 = 75.116
    const result = calcularPesoPredito("180", "M");
    expect(result).toBeCloseTo(75.116, 2);
  });

  it("retorna null quando sexo está vazio", () => {
    expect(calcularPesoPredito("1.70", "")).toBeNull();
  });

  it("retorna null quando altura é texto inválido", () => {
    expect(calcularPesoPredito("abc", "M")).toBeNull();
  });

  it("retorna null quando altura é zero", () => {
    expect(calcularPesoPredito("0", "M")).toBeNull();
  });

  it("retorna null quando altura é negativa", () => {
    expect(calcularPesoPredito("-1.70", "M")).toBeNull();
  });

  it("retorna null quando altura está vazia", () => {
    expect(calcularPesoPredito("", "F")).toBeNull();
  });
});

describe("formatarPesoPredito", () => {
  it("retorna travessão quando valor é null", () => {
    expect(formatarPesoPredito(null)).toBe("—");
  });

  it("formata com 1 casa decimal", () => {
    expect(formatarPesoPredito(63.2)).toBe("63.2");
  });

  it("arredonda corretamente", () => {
    expect(formatarPesoPredito(66.016)).toBe("66.0");
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

```bash
cd /Users/yvillanova/Documents/Claude/Projects/ERP/.worktrees/feature/modulo-anestesia
npx vitest run src/modules/anestesia/utils/__tests__/session.test.ts
```

Esperado: erros de importação — `calcularPesoPredito` e `formatarPesoPredito` não existem ainda.

- [ ] **Step 3: Implementar as funções em `session.ts`**

Adicione ao final de `src/modules/anestesia/utils/session.ts`:

```ts
/**
 * Calcula o Peso Predito (Peso Corporal Ideal) pela fórmula de Devine.
 * Retorna null se altura ou sexo forem inválidos/ausentes.
 */
export function calcularPesoPredito(altura: string, sexo: string): number | null {
  if (!sexo) return null;

  const alturaNum = parseFloat(altura.replace(",", "."));
  if (!isFinite(alturaNum) || alturaNum <= 0) return null;

  const alturaCm = alturaNum > 3 ? alturaNum : alturaNum * 100;
  const base = sexo === "M" ? 50 : 45.5;
  return base + 0.91 * (alturaCm - 152.4);
}

/**
 * Formata o Peso Predito com 1 casa decimal. Retorna "—" se null.
 */
export function formatarPesoPredito(pp: number | null): string {
  if (pp === null) return "—";
  return pp.toFixed(1);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
npx vitest run src/modules/anestesia/utils/__tests__/session.test.ts
```

Esperado: todos os testes passando, incluindo os novos blocos `calcularPesoPredito` e `formatarPesoPredito`.

- [ ] **Step 5: Commit**

```bash
cd /Users/yvillanova/Documents/Claude/Projects/ERP/.worktrees/feature/modulo-anestesia
git add src/modules/anestesia/utils/session.ts src/modules/anestesia/utils/__tests__/session.test.ts
git commit -m "feat(anestesia): adiciona calcularPesoPredito e formatarPesoPredito (fórmula de Devine)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Card de Peso Predito na UI

**Files:**

- Modify: `src/modules/anestesia/components/pre-avaliacao/sinais-vitais-section.tsx`

---

- [ ] **Step 1: Atualizar o componente `SinaisVitaisSection`**

Substitua o conteúdo completo de `src/modules/anestesia/components/pre-avaliacao/sinais-vitais-section.tsx` por:

```tsx
"use client";

import { Input } from "@/components/ui/input";
import type { PreAvaliacaoData } from "../../types";
import {
  calcularIMC,
  calcularPesoPredito,
  classificarIMC,
  formatarIMC,
  formatarPesoPredito,
} from "../../utils/session";
import { SectionCard, formInputClassName } from "../shared";

type Props = {
  data: PreAvaliacaoData;
  onChange: (partial: Partial<PreAvaliacaoData>) => void;
};

const vitalsFields = [
  { key: "peso", label: "Peso", suffix: "kg" },
  { key: "altura", label: "Altura", suffix: "m" },
  { key: "pa", label: "PA", suffix: "mmHg" },
  { key: "temperatura", label: "Temperatura", suffix: "°C" },
] as const;

export function SinaisVitaisSection({ data, onChange }: Props) {
  const imc = calcularIMC(data.peso, data.altura);
  const imcFormatado = formatarIMC(imc);
  const imcClassificacao = classificarIMC(imc);

  const pesoPredito = calcularPesoPredito(data.altura, data.sexo);
  const pesoPreditoFormatado = formatarPesoPredito(pesoPredito);

  return (
    <SectionCard
      title="Sinais vitais"
      description="Valores iniciais para referência clínica e impressão."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {vitalsFields.map((field) => (
          <div key={field.key} className="rounded-xl border bg-muted/20 p-4">
            <p className="text-sm font-medium text-muted-foreground">{field.label}</p>
            <div className="mt-3 flex items-center gap-2">
              <Input
                className={formInputClassName}
                value={data[field.key]}
                onChange={(event) =>
                  onChange({ [field.key]: event.target.value } as Partial<PreAvaliacaoData>)
                }
              />
              <span className="text-xs text-muted-foreground">{field.suffix}</span>
            </div>
          </div>
        ))}

        {/* IMC calculado */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium text-muted-foreground">IMC</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums">{imcFormatado}</span>
            {imc !== null && <span className="text-xs text-muted-foreground">kg/m²</span>}
          </div>
          {imcClassificacao && (
            <p className="mt-1 text-xs text-muted-foreground">{imcClassificacao}</p>
          )}
        </div>

        {/* Peso Predito calculado (fórmula de Devine) */}
        <div className="rounded-xl border bg-muted/20 p-4">
          <p className="text-sm font-medium text-muted-foreground">Peso Predito</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-xl font-semibold tabular-nums">{pesoPreditoFormatado}</span>
            {pesoPredito !== null && <span className="text-xs text-muted-foreground">kg</span>}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

```bash
cd /Users/yvillanova/Documents/Claude/Projects/ERP/.worktrees/feature/modulo-anestesia
npx tsc --noEmit 2>&1 | head -30
```

Esperado: sem erros de tipo.

- [ ] **Step 3: Rodar todos os testes**

```bash
npx vitest run
```

Esperado: todos os testes passando.

- [ ] **Step 4: Commit**

```bash
git add src/modules/anestesia/components/pre-avaliacao/sinais-vitais-section.tsx
git commit -m "feat(anestesia): exibe card Peso Predito na seção sinais vitais

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
