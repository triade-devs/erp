# Design: Campo Peso Predito na seção Sinais Vitais

**Data:** 2026-05-18  
**Branch:** feature/modulo-anestesia  
**Módulo:** `src/modules/anestesia`

## Problema

A seção de Sinais Vitais da pré-avaliação anestésica exibe IMC como campo calculado, mas não expõe o **Peso Predito** (Peso Corporal Ideal), que é referência clínica essencial para cálculo de volume corrente na ventilação mecânica.

## Solução

Adicionar Peso Predito como campo calculado (somente leitura), seguindo o mesmo padrão visual do IMC já existente. Nenhuma alteração em schema, tipos ou storage — o valor é 100% derivado de `altura` e `sexo`, ambos já presentes em `PreAvaliacaoData`.

## Fórmula

**Fórmula de Devine:**

- Masculino: `PP = 50 + 0.91 × (altura_cm − 152.4)`
- Feminino: `PP = 45.5 + 0.91 × (altura_cm − 152.4)`

A altura aceita entrada em metros (ex: `1.70`) ou centímetros (ex: `170`), usando a mesma normalização já aplicada no `calcularIMC`.

Retorna `null` (exibe `"—"`) quando:

- Altura inválida ou ≤ 0
- Sexo não preenchido (`""`)

## Arquivos alterados

### `src/modules/anestesia/utils/session.ts`

Adicionar duas funções:

```ts
/**
 * Calcula o Peso Predito (Peso Corporal Ideal) pela fórmula de Devine.
 * Retorna null se altura ou sexo forem inválidos/ausentes.
 */
export function calcularPesoPredito(altura: string, sexo: string): number | null;

/**
 * Formata o Peso Predito com 1 casa decimal. Retorna "—" se null.
 */
export function formatarPesoPredito(pp: number | null): string;
```

### `src/modules/anestesia/components/pre-avaliacao/sinais-vitais-section.tsx`

- Importar `calcularPesoPredito` e `formatarPesoPredito`
- Calcular `pesoPredito` e `pesoPreditoFormatado` a partir de `data.altura` e `data.sexo`
- Adicionar card de Peso Predito após o card de IMC, com label `"Peso Predito"`, valor formatado e unidade `"kg"` (omitida quando `"—"`)
- Ajustar grid de `xl:grid-cols-5` para acomodar 6 cards (manter `md:grid-cols-2`, ajustar xl para `xl:grid-cols-3`)

## Testes

Adicionar casos em `utils/__tests__/session.test.ts`:

- Masculino altura em metros → valor correto
- Feminino altura em cm → valor correto
- Sexo vazio → `null`
- Altura inválida → `null`
- Altura ≤ 0 → `null`
- `formatarPesoPredito(null)` → `"—"`
- `formatarPesoPredito(63.2)` → `"63.2"`

## Fora de escopo

- Não persiste Peso Predito no storage (valor calculado on-the-fly)
- Não adiciona campo editável para override manual
- Não exibe o nome da fórmula na UI
