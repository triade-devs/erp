import { buildSchemaState } from "./migrations.js";

/**
 * Catálogo consolidado de permissions extraído de todas as migrations.
 * Reusa o `buildSchemaState` que já varre as migrations em ordem.
 */
export async function listPermissions(repoRoot: string): Promise<string[]> {
  const state = await buildSchemaState(repoRoot);
  return [...state.permissions].sort();
}
