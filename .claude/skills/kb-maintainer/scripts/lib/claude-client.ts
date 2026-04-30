import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Wrapper enxuto do Vercel AI SDK para gerar rascunhos de doc.
 *
 * Templates ficam em `templates/*.md` e usam placeholders `{{var}}`.
 * Este wrapper cuida da substituição, da chamada e de validar que a saída
 * começa com `---` (frontmatter MDX) — proteção contra resposta livre.
 */
const MODEL = process.env.KB_MAINTAINER_MODEL ?? "claude-sonnet-4-5";

export interface DraftRequest {
  templatePath: string;
  variables: Record<string, string>;
}

export async function renderTemplate(
  repoRoot: string,
  templateRel: string,
  vars: Record<string, string>,
): Promise<string> {
  const path = join(repoRoot, ".claude/skills/kb-maintainer/templates", templateRel);
  let raw = await readFile(path, "utf8");
  for (const [k, v] of Object.entries(vars)) {
    raw = raw.split(`{{${k}}}`).join(v);
  }
  return raw;
}

export async function generateDraft(req: DraftRequest, repoRoot: string): Promise<string> {
  const prompt = await renderTemplate(repoRoot, req.templatePath, req.variables);

  const { text } = await generateText({
    model: anthropic(MODEL),
    prompt,
    temperature: 0.3, // baixo: queremos consistência, não criatividade
    maxTokens: 2000,
  });

  if (!text.trimStart().startsWith("---")) {
    throw new Error(
      `Geração não começou com frontmatter MDX (template=${req.templatePath}). Saída ignorada.`,
    );
  }
  return text.trim() + "\n";
}
