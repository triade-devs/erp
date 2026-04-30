import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Lê os barrels (`src/modules/<dom>/index.ts`) e extrai a lista de exports
 * nomeados. Usado pelo detector `module-exports-cell` (AUTO) e pelo
 * `module-without-article` (DRAFT).
 */
export interface ModuleBarrel {
  module: string;
  exports: string[];
}

export async function listModules(repoRoot: string): Promise<ModuleBarrel[]> {
  const dir = join(repoRoot, "src/modules");
  const dirs = await readdir(dir, { withFileTypes: true });
  const out: ModuleBarrel[] = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const indexPath = join(dir, d.name, "index.ts");
    try {
      const src = await readFile(indexPath, "utf8");
      const exports = parseExports(src);
      out.push({ module: d.name, exports });
    } catch {
      // sem barrel — módulo incompleto, ignora silenciosamente
    }
  }
  return out;
}

function parseExports(src: string): string[] {
  const names = new Set<string>();
  // export { foo, bar as baz } from "..."
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1]!.split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/i)
        .pop()
        ?.trim();
      if (name) names.add(name);
    }
  }
  // export type { Foo, Bar }
  for (const m of src.matchAll(/export\s+type\s*\{([^}]+)\}/g)) {
    for (const part of m[1]!.split(",")) {
      const name = part.trim();
      if (name) names.add(name);
    }
  }
  return [...names].sort();
}
