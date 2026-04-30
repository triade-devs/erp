import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import matter from "gray-matter";

/**
 * Varre `src/content/docs/**` e devolve o estado de cada MDX
 * (frontmatter + hash do body), usado por todos os detectores
 * que escrevem em MDX.
 */
export interface MdxDoc {
  path: string; // relativo ao repoRoot
  frontmatter: Record<string, unknown>;
  body: string;
}

export async function listMdxDocs(repoRoot: string): Promise<MdxDoc[]> {
  const root = join(repoRoot, "src/content/docs");
  const out: MdxDoc[] = [];
  await walk(root, async (full) => {
    if (!full.endsWith(".mdx")) return;
    const raw = await readFile(full, "utf8");
    const { data, content } = matter(raw);
    out.push({ path: relative(repoRoot, full), frontmatter: data, body: content });
  });
  return out;
}

async function walk(dir: string, fn: (full: string) => Promise<void>): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return; // diretório ainda não existe — F2 do plano KB
  }
  for (const name of entries) {
    const full = join(dir, name);
    const { stat } = await import("node:fs/promises");
    const s = await stat(full);
    if (s.isDirectory()) await walk(full, fn);
    else await fn(full);
  }
}
