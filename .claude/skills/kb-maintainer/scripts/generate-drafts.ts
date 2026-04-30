#!/usr/bin/env tsx
/**
 * generate-drafts — gera artigos rascunho a partir dos detectores DRAFT.
 *
 * TODO(M4): consumir report.json, montar variáveis de cada template,
 * chamar `lib/claude-client.generateDraft` e gravar no destino apropriado
 * (MDX no filesystem ou linha em kb_articles).
 *
 * Por ora, este arquivo apenas valida que o setup do AI SDK está OK.
 */
import { generateDraft } from "./lib/claude-client.js";
import { resolve } from "node:path";

async function main() {
  console.log("[generate-drafts] ainda em M0/M1 — implementação real entra na fase M4.");
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("[generate-drafts] ANTHROPIC_API_KEY presente — pronto para M4.");
  } else {
    console.log("[generate-drafts] ANTHROPIC_API_KEY ausente — configure quando for ativar M4.");
  }
}

main().catch((e) => {
  console.error("[generate-drafts] erro:", e);
  process.exit(1);
});
