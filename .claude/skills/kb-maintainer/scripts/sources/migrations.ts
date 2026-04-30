import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Parser leve de migrations SQL — extrai tabelas, colunas, policies,
 * funções e triggers. Não pretende ser um parser SQL completo; serve
 * só para detecção de drift estrutural.
 *
 * Estratégia: regex direcionada em vez de AST. Falsos negativos são
 * preferíveis a falsos positivos (geram BLOCK e travariam merges).
 */

export interface ParsedMigration {
  file: string;
  tablesCreated: string[];
  tablesDropped: string[];
  columnsAdded: { table: string; column: string; type: string }[];
  policies: { table: string; name: string; verb: string }[];
  functionsCreated: string[];
  functionsDropped: string[];
  triggersCreated: { name: string; table: string }[];
  permissionsInserted: string[]; // chaves "module:resource:action"
}

export async function listMigrationFiles(repoRoot: string): Promise<string[]> {
  const dir = join(repoRoot, "supabase/migrations");
  const files = await readdir(dir);
  return files
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => join("supabase/migrations", f));
}

export async function parseMigration(repoRoot: string, relPath: string): Promise<ParsedMigration> {
  const sql = await readFile(join(repoRoot, relPath), "utf8");
  return {
    file: relPath,
    tablesCreated: matchAll(
      sql,
      /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi,
    ).map((m) => m[1]!),
    tablesDropped: matchAll(sql, /drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)/gi).map(
      (m) => m[1]!,
    ),
    columnsAdded: matchAll(
      sql,
      /alter\s+table\s+(?:public\.)?(\w+)\s+add\s+column\s+(\w+)\s+([\w()]+)/gi,
    ).map((m) => ({ table: m[1]!, column: m[2]!, type: m[3]! })),
    policies: matchAll(
      sql,
      /create\s+policy\s+"?([\w-]+)"?\s+on\s+(?:public\.)?(\w+)\s+for\s+(\w+)/gi,
    ).map((m) => ({ name: m[1]!, table: m[2]!, verb: m[3]! })),
    functionsCreated: matchAll(
      sql,
      /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?(\w+)/gi,
    ).map((m) => m[1]!),
    functionsDropped: matchAll(
      sql,
      /drop\s+function\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)/gi,
    ).map((m) => m[1]!),
    triggersCreated: matchAll(sql, /create\s+trigger\s+(\w+)[\s\S]*?on\s+(?:public\.)?(\w+)/gi).map(
      (m) => ({ name: m[1]!, table: m[2]! }),
    ),
    permissionsInserted: matchAll(
      sql,
      /insert\s+into\s+(?:public\.)?permissions[\s\S]*?values[\s\S]*?\(\s*'([\w:-]+)'/gi,
    ).map((m) => m[1]!),
  };
}

function matchAll(text: string, re: RegExp): RegExpMatchArray[] {
  const out: RegExpMatchArray[] = [];
  for (const m of text.matchAll(re)) out.push(m);
  return out;
}

/** Compõe o estado final do schema percorrendo todas as migrations em ordem. */
export async function buildSchemaState(repoRoot: string): Promise<{
  tables: Set<string>;
  permissions: Set<string>;
  triggers: Map<string, string>; // trigger -> table
  functions: Set<string>;
}> {
  const files = await listMigrationFiles(repoRoot);
  const tables = new Set<string>();
  const permissions = new Set<string>();
  const triggers = new Map<string, string>();
  const fns = new Set<string>();

  for (const f of files) {
    const m = await parseMigration(repoRoot, f);
    m.tablesCreated.forEach((t) => tables.add(t));
    m.tablesDropped.forEach((t) => tables.delete(t));
    m.permissionsInserted.forEach((p) => permissions.add(p));
    m.functionsCreated.forEach((fn) => fns.add(fn));
    m.functionsDropped.forEach((fn) => fns.delete(fn));
    m.triggersCreated.forEach((t) => triggers.set(t.name, t.table));
  }
  return { tables, permissions, triggers, functions: fns };
}
