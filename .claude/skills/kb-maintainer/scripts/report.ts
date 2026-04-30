import type { DriftItem, DriftReport, Severity } from "./types.js";

const ICON: Record<Severity, string> = { AUTO: "🤖", DRAFT: "📝", BLOCK: "🛑" };
const TITLE: Record<Severity, string> = {
  AUTO: "Aplicado automaticamente",
  DRAFT: "Rascunho gerado — revisar",
  BLOCK: "Bloqueio — corrigir antes do merge",
};

/** Markdown final que vai pro comentário do PR. */
export function renderMarkdown(report: DriftReport): string {
  const { summary, items } = report;
  const head = [
    `## kb-maintainer · ${summary.total === 0 ? "✅ KB sincronizada" : "Resumo de drift"}`,
    "",
    `| 🤖 AUTO | 📝 DRAFT | 🛑 BLOCK | Total |`,
    `|---:|---:|---:|---:|`,
    `| ${summary.auto} | ${summary.drafts} | ${summary.blocks} | ${summary.total} |`,
    "",
  ];
  if (summary.total === 0) {
    head.push("Nenhuma divergência encontrada entre código e documentação.");
    return head.join("\n");
  }

  const bySev: Record<Severity, DriftItem[]> = { AUTO: [], DRAFT: [], BLOCK: [] };
  for (const it of items) bySev[it.severity].push(it);

  for (const sev of ["BLOCK", "DRAFT", "AUTO"] as const) {
    if (bySev[sev].length === 0) continue;
    head.push(`### ${ICON[sev]} ${TITLE[sev]}`, "");
    for (const it of bySev[sev]) {
      head.push(`- **\`${it.detector}\`** — ${it.summary}`);
      if (it.targets.length) head.push(`  - alvo: ${it.targets.map((t) => `\`${t}\``).join(", ")}`);
      if (it.sources.length)
        head.push(`  - fonte: ${it.sources.map((s) => `\`${s}\``).join(", ")}`);
    }
    head.push("");
  }
  head.push(
    "> Ajuste o relatório executando `npx tsx .claude/skills/kb-maintainer/scripts/detect-drift.ts --dry-run` localmente.",
  );
  return head.join("\n");
}
