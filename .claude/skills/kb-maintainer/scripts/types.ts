/**
 * Tipos compartilhados pelos detectores e fixers da skill kb-maintainer.
 * Toda a comunicação entre módulos passa por DriftItem — ele é o "envelope" do sistema.
 */

export type Severity = "AUTO" | "DRAFT" | "BLOCK";

export type DetectorId =
  | "embeddings-stale"
  | "module-exports-cell"
  | "permissions-catalog-cell"
  | "remotion-rerender"
  | "mdx-frontmatter-fix"
  | "migration-without-article"
  | "module-without-article"
  | "permission-without-article"
  | "rls-policy-changed"
  | "orphan-related-table"
  | "dropped-permission-still-documented"
  | "renamed-trigger-stale-doc"
  | "kb-table-schema-changed";

/** Item canônico de drift. Toda detecção retorna um array desses. */
export interface DriftItem {
  detector: DetectorId;
  severity: Severity;
  /** Chave humana e única (ex.: "tabela:stock_movements", "modulo:inventory"). */
  key: string;
  /** Resumo curto para o relatório (1 linha). */
  summary: string;
  /** Detalhes ricos (markdown) para o relatório expandido. */
  details: string;
  /** Caminhos de arquivos-fonte que motivaram este drift. */
  sources: string[];
  /** Caminhos/IDs do alvo de doc que precisa de atualização. */
  targets: string[];
  /** Dados estruturados para o fixer/gerador consumir. */
  payload?: Record<string, unknown>;
}

/** Resultado consolidado do detect-drift. */
export interface DriftReport {
  generated_at: string;
  pr_ref?: string;
  summary: { auto: number; drafts: number; blocks: number; total: number };
  items: DriftItem[];
}

/** Manifesto cacheado (.kb-maintainer/manifest.json). */
export interface Manifest {
  version: 1;
  generated_at: string;
  /** Hash sha256 por arquivo-fonte. */
  sources: Record<string, string>;
  /** Hash + dependências por target. */
  targets: Record<string, { hash: string; based_on: string[] }>;
}
