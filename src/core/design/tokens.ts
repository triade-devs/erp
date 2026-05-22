/**
 * Design tokens — ERP Modular
 *
 * Mirror TypeScript dos tokens CSS. Use estes valores em contextos
 * programáticos onde `hsl(var(--token))` não é acessível:
 *   - bibliotecas de gráficos (Recharts, Chart.js, D3)
 *   - canvas / WebGL
 *   - animações imperativas (Framer Motion transforms)
 *
 * IMPORTANTE: os valores abaixo referenciam as CSS custom properties.
 * Eles funcionam dentro do DOM/browser. Para contexts fora do DOM,
 * leia os valores em runtime via `getComputedStyle(document.documentElement)`.
 *
 * Para adicionar tokens: edite globals.css primeiro, depois espelhe aqui.
 */

export const tokens = {
  colors: {
    primary: "hsl(var(--primary))",
    primaryForeground: "hsl(var(--primary-foreground))",

    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    card: "hsl(var(--card))",
    muted: "hsl(var(--muted))",
    mutedForeground: "hsl(var(--muted-foreground))",

    destructive: "hsl(var(--destructive))",
    destructiveMuted: "hsl(var(--destructive-muted))",
    success: "hsl(var(--success))",
    successMuted: "hsl(var(--success-muted))",
    warning: "hsl(var(--warning))",
    warningMuted: "hsl(var(--warning-muted))",
    info: "hsl(var(--info))",
    infoMuted: "hsl(var(--info-muted))",

    /** Paleta de 5 cores para gráficos (índice 0–4) */
    chart: [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ] as readonly string[],
  },

  radius: "var(--radius)",
} as const;

export type DesignTokens = typeof tokens;

/** Lê o valor resolvido de um token CSS em runtime (client-side only). */
export function resolveToken(variable: string): string {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}
