/**
 * Tipos para o validador de fases (phase gates).
 *
 * Cada fase do plano da KB (F0..F5) tem uma lista de checagens
 * programáticas. Um phase gate roda essas checagens e fecha (ou não)
 * a fase. Sem hospedar nada — tudo é filesystem + shell + Supabase.
 */

export type CheckKind =
  | "file-exists" // glob match em arquivos
  | "file-contains" // arquivo contém regex
  | "package-json-has" // dependência declarada em package.json (root do projeto)
  | "menu-has-permission" // src/core/navigation/menu.ts referencia permission
  | "permissions-present" // permissions semeadas em alguma migration
  | "barrel-exports" // barrel de módulo exporta nomes específicos
  | "shell" // executa comando shell, exit 0 = passa
  | "supabase-table-exists"; // tabela existe (precisa SUPABASE_URL + SERVICE_ROLE) — opcional

export interface BaseCheck {
  id: string;
  description: string;
  kind: CheckKind;
  /** Marca como opcional — falha não derruba a fase (vira warning). */
  optional?: boolean;
}

export interface FileExistsCheck extends BaseCheck {
  kind: "file-exists";
  /** Glob relativo ao repoRoot. Aceita * e **. */
  glob: string;
}
export interface FileContainsCheck extends BaseCheck {
  kind: "file-contains";
  path: string; // relativo ao repoRoot
  pattern: string; // regex
}
export interface PackageJsonHasCheck extends BaseCheck {
  kind: "package-json-has";
  dep: string;
  section?: "dependencies" | "devDependencies";
}
export interface MenuHasPermissionCheck extends BaseCheck {
  kind: "menu-has-permission";
  permission: string;
}
export interface PermissionsPresentCheck extends BaseCheck {
  kind: "permissions-present";
  permissions: string[];
}
export interface BarrelExportsCheck extends BaseCheck {
  kind: "barrel-exports";
  module: string; // nome do módulo dentro de src/modules/
  exports: string[];
}
export interface ShellCheck extends BaseCheck {
  kind: "shell";
  command: string;
}
export interface SupabaseTableExistsCheck extends BaseCheck {
  kind: "supabase-table-exists";
  table: string;
}

export type PhaseCheck =
  | FileExistsCheck
  | FileContainsCheck
  | PackageJsonHasCheck
  | MenuHasPermissionCheck
  | PermissionsPresentCheck
  | BarrelExportsCheck
  | ShellCheck
  | SupabaseTableExistsCheck;

export interface PhaseChecklist {
  id: "F0" | "F1" | "F2" | "F3" | "F4" | "F5";
  name: string;
  description: string;
  /** Outras fases que precisam estar verdes antes desta rodar (gate dependency). */
  requires?: ("F0" | "F1" | "F2" | "F3" | "F4" | "F5")[];
  checks: PhaseCheck[];
}

export interface CheckResult {
  id: string;
  description: string;
  passed: boolean;
  optional: boolean;
  evidence: string;
}

export interface PhaseReport {
  phase: PhaseChecklist["id"];
  name: string;
  generated_at: string;
  passed: boolean;
  total: number;
  passed_count: number;
  failed_required: number;
  failed_optional: number;
  results: CheckResult[];
}
