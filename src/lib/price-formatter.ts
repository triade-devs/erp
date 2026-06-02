import { useState } from "react";

/** Normaliza qualquer entrada do usuário em centavos inteiros. */
function toCents(raw: string): number {
  if (!raw.trim()) return 0;
  const cleaned = raw.replace(/\s/g, "");
  let normalized: string;
  if (cleaned.includes(",")) {
    // formato BR: pontos são milhar, vírgula é decimal
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = cleaned;
  }
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** "1000.00" — decimal SQL a partir de qualquer entrada do usuário. */
export function parsePriceToDecimal(display: string): string {
  return (toCents(display) / 100).toFixed(2);
}

/** "1.000,00" — exibição pt-BR a partir de qualquer entrada do usuário. */
export function formatPriceDisplay(raw: string): string {
  const decimal = (toCents(raw) / 100).toFixed(2);
  const [intPart, centPart] = decimal.split(".");
  const withThousands = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${centPart}`;
}

/** Hook para campos de preço: exibição formatada + valor decimal para hidden input. */
export function usePriceInput(initialValue?: string) {
  const [displayValue, setDisplayValue] = useState(() =>
    initialValue ? formatPriceDisplay(initialValue) : "",
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDisplayValue(e.target.value);
  }

  function handleBlur() {
    setDisplayValue((v) => (v.trim() ? formatPriceDisplay(v) : ""));
  }

  return {
    displayValue,
    handleChange,
    handleBlur,
    decimalValue: parsePriceToDecimal(displayValue),
  };
}
