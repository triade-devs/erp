/**
 * Classificador de severidade.
 *
 * Por que existe um arquivo só pra isso?
 * Porque a regra de severidade é a parte da skill que o time mais vai discutir
 * ao longo do tempo. Concentrar num único lugar evita que cada detector defina
 * o seu critério e a skill vire uma colcha de retalhos.
 *
 * Princípio: "na dúvida entre AUTO e DRAFT, escolha DRAFT."
 */
import type { DetectorId, Severity } from "./types.js";

export const SEVERITY_BY_DETECTOR: Record<DetectorId, Severity> = {
  // AUTO — fixes mecânicos, idempotentes, reversíveis
  "embeddings-stale": "AUTO",
  "module-exports-cell": "AUTO",
  "permissions-catalog-cell": "AUTO",
  "remotion-rerender": "AUTO",
  "mdx-frontmatter-fix": "AUTO",

  // DRAFT — gera rascunho via IA, requer revisão humana
  "migration-without-article": "DRAFT",
  "module-without-article": "DRAFT",
  "permission-without-article": "DRAFT",
  "rls-policy-changed": "DRAFT",

  // BLOCK — referência destrutiva, falha o CI
  "orphan-related-table": "BLOCK",
  "dropped-permission-still-documented": "BLOCK",
  "renamed-trigger-stale-doc": "BLOCK",
  "kb-table-schema-changed": "BLOCK",
};

/** Retorna severidade fixa do detector. */
export function classify(detector: DetectorId): Severity {
  return SEVERITY_BY_DETECTOR[detector];
}

/** Útil para o relatório: agrupa contagens por severidade. */
export function summarize(items: { severity: Severity }[]) {
  const summary = { auto: 0, drafts: 0, blocks: 0, total: items.length };
  for (const it of items) {
    if (it.severity === "AUTO") summary.auto++;
    else if (it.severity === "DRAFT") summary.drafts++;
    else summary.blocks++;
  }
  return summary;
}
