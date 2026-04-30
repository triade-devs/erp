import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Parser do `src/remotion/Root.tsx` para extrair composições registradas.
 * Detector `remotion-rerender` usa isso pra disparar re-render quando
 * uma composição muda.
 *
 * TODO(M1): extrair também durationInFrames/fps para validar contra
 * `kb_videos.duration_s`.
 */
export interface CompositionRef {
  id: string;
  componentImport: string;
}

export async function listCompositions(repoRoot: string): Promise<CompositionRef[]> {
  const path = join(repoRoot, "src/remotion/Root.tsx");
  let src = "";
  try {
    src = await readFile(path, "utf8");
  } catch {
    return []; // Remotion ainda não instalado — sem drift possível
  }
  const out: CompositionRef[] = [];
  for (const m of src.matchAll(/<Composition[^>]*id=["']([\w-]+)["'][^>]*component=\{(\w+)\}/g)) {
    out.push({ id: m[1]!, componentImport: m[2]! });
  }
  return out;
}
