#!/usr/bin/env tsx
/**
 * detect-drift — entrada principal da skill kb-maintainer.
 *
 * Orquestra todos os detectores, classifica severidade, escreve relatório
 * em report.md / report.json e (em modo --ci) aciona os fixers.
 *
 * Modos:
 *   --ci         aplica AUTO, gera DRAFT, falha em BLOCK
 *   --dry-run    só relata, não escreve nada (default se nenhum modo)
 *   --report-path <file>
 *   --json-out  <file>
 */
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DriftItem, DriftReport } from "./types.js";
import { classify, summarize } from "./classify.js";
import { renderMarkdown } from "./report.js";

import { buildSchemaState } from "./sources/migrations.js";
import { listModules } from "./sources/modules.js";
import { listPermissions } from "./sources/permissions.js";
import { listCompositions } from "./sources/remotion.js";
import { listMdxDocs } from "./sources/content-docs.js";
import { listKbArticles } from "./targets/kb-articles.js";

interface Cli {
  ci: boolean;
  dryRun: boolean;
  reportPath: string;
  jsonOut: string;
}

function parseCli(argv: string[]): Cli {
  const cli: Cli = { ci: false, dryRun: false, reportPath: "report.md", jsonOut: "report.json" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ci") cli.ci = true;
    else if (a === "--dry-run") cli.dryRun = true;
    else if (a === "--report-path") cli.reportPath = argv[++i] ?? cli.reportPath;
    else if (a === "--json-out") cli.jsonOut = argv[++i] ?? cli.jsonOut;
  }
  if (!cli.ci && !cli.dryRun) cli.dryRun = true;
  return cli;
}

type Detector = (ctx: Ctx) => Promise<DriftItem[]>;

interface Ctx {
  repoRoot: string;
  schema: Awaited<ReturnType<typeof buildSchemaState>>;
  modules: Awaited<ReturnType<typeof listModules>>;
  permissions: string[];
  compositions: Awaited<ReturnType<typeof listCompositions>>;
  mdxDocs: Awaited<ReturnType<typeof listMdxDocs>>;
  kbArticles: Awaited<ReturnType<typeof listKbArticles>>;
}

// =========================================================================
// DETECTORES
// Cada um tem que devolver DriftItem[] com `detector` preenchido. A severidade
// é injetada por `classify(detector)` — não setar à mão para manter o
// classificador como única fonte de verdade.
// =========================================================================

const migrationWithoutArticle: Detector = async (ctx) => {
  const out: DriftItem[] = [];
  const documentedTables = new Set<string>([
    ...ctx.kbArticles.map((a) => a.related_table).filter((x): x is string => !!x),
    ...ctx.mdxDocs
      .map((d) => d.frontmatter.related_table as string | undefined)
      .filter((x): x is string => !!x),
  ]);
  for (const table of ctx.schema.tables) {
    if (table.startsWith("kb_")) continue; // doc do próprio sistema é detector específico
    if (documentedTables.has(table)) continue;
    out.push({
      detector: "migration-without-article",
      severity: classify("migration-without-article"),
      key: `tabela:${table}`,
      summary: `Tabela \`${table}\` não tem artigo correspondente.`,
      details: `Nenhum artigo em \`kb_articles\` (\`related_table='${table}'\`) nem MDX em \`src/content/docs/tabelas/${table}.mdx\`.`,
      sources: [`supabase/migrations/<ver migrations que criam ${table}>`],
      targets: [`src/content/docs/tabelas/${table}.mdx`],
      payload: { table },
    });
  }
  return out;
};

const moduleWithoutArticle: Detector = async (ctx) => {
  const out: DriftItem[] = [];
  const documentedModules = new Set<string>(
    ctx.mdxDocs
      .map((d) => d.frontmatter.related_module as string | undefined)
      .filter((x): x is string => !!x),
  );
  for (const m of ctx.modules) {
    if (documentedModules.has(m.module)) continue;
    out.push({
      detector: "module-without-article",
      severity: classify("module-without-article"),
      key: `modulo:${m.module}`,
      summary: `Módulo \`${m.module}\` sem doc técnica.`,
      details: `Nenhum MDX com \`related_module: ${m.module}\` em \`src/content/docs/modulos/\`. Exports detectados: ${m.exports.length}.`,
      sources: [`src/modules/${m.module}/index.ts`],
      targets: [`src/content/docs/modulos/${m.module}.mdx`],
      payload: { module: m.module, exports: m.exports },
    });
  }
  return out;
};

const orphanRelatedTable: Detector = async (ctx) => {
  const out: DriftItem[] = [];
  const liveTables = ctx.schema.tables;
  const referenced: { ref: string; from: string }[] = [];
  for (const a of ctx.kbArticles) {
    if (a.related_table) referenced.push({ ref: a.related_table, from: `kb_articles:${a.slug}` });
  }
  for (const d of ctx.mdxDocs) {
    const t = d.frontmatter.related_table as string | undefined;
    if (t) referenced.push({ ref: t, from: d.path });
  }
  for (const r of referenced) {
    if (!liveTables.has(r.ref)) {
      out.push({
        detector: "orphan-related-table",
        severity: classify("orphan-related-table"),
        key: `orphan:${r.ref}@${r.from}`,
        summary: `Doc \`${r.from}\` aponta para tabela inexistente \`${r.ref}\`.`,
        details: `A migration que removeu \`${r.ref}\` deveria ter atualizado ou arquivado este artigo. Drift bloqueante.`,
        sources: [r.from],
        targets: [r.from],
        payload: { table: r.ref, from: r.from },
      });
    }
  }
  return out;
};

const permissionWithoutArticle: Detector = async (ctx) => {
  // Heurística simples: existe pelo menos um MDX/article que mencione cada permission?
  const docCorpus = [
    ...ctx.mdxDocs.map((d) => d.body),
    // TODO(M5): incluir kb_articles.content_md aqui.
  ].join("\n");
  const out: DriftItem[] = [];
  for (const perm of ctx.permissions) {
    if (docCorpus.includes(perm)) continue;
    out.push({
      detector: "permission-without-article",
      severity: classify("permission-without-article"),
      key: `perm:${perm}`,
      summary: `Permissão \`${perm}\` não documentada.`,
      details: `Nenhum artigo menciona \`${perm}\`. Rascunho será adicionado ao artigo central de RBAC quando M4 estiver implementado.`,
      sources: ["supabase/migrations/<seed_core_permissions>"],
      targets: ["src/content/docs/arquitetura/rls-rbac.mdx"],
      payload: { permission: perm },
    });
  }
  return out;
};

// TODO(M1+): implementar os detectores restantes, na ordem:
// - mdx-frontmatter-fix (AUTO)         — valida title/audience nos MDX
// - module-exports-cell (AUTO)         — sincroniza tabela de exports
// - permissions-catalog-cell (AUTO)    — sincroniza tabela do RBAC
// - rls-policy-changed (DRAFT)         — diff de policies vs último hash
// - embeddings-stale (AUTO)            — depende de F4 do plano KB
// - remotion-rerender (AUTO)           — depende de F3 do plano KB
// - dropped-permission-still-documented (BLOCK)
// - renamed-trigger-stale-doc (BLOCK)
// - kb-table-schema-changed (BLOCK)    — auto-doc do próprio sistema

const DETECTORS: Detector[] = [
  migrationWithoutArticle,
  moduleWithoutArticle,
  orphanRelatedTable,
  permissionWithoutArticle,
];

// =========================================================================

async function run() {
  const cli = parseCli(process.argv.slice(2));
  const repoRoot = resolve(process.cwd(), "../../..");

  const [schema, modules, permissions, compositions, mdxDocs, kbArticles] = await Promise.all([
    buildSchemaState(repoRoot),
    listModules(repoRoot),
    listPermissions(repoRoot),
    listCompositions(repoRoot),
    listMdxDocs(repoRoot),
    listKbArticles(),
  ]);

  const ctx: Ctx = { repoRoot, schema, modules, permissions, compositions, mdxDocs, kbArticles };

  const items: DriftItem[] = [];
  for (const det of DETECTORS) {
    try {
      const found = await det(ctx);
      items.push(...found);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[detect-drift] detector falhou:`, msg);
    }
  }

  const report: DriftReport = {
    generated_at: new Date().toISOString(),
    pr_ref: process.env.GITHUB_HEAD_REF,
    summary: summarize(items),
    items,
  };

  await writeFile(cli.reportPath, renderMarkdown(report), "utf8");
  await writeFile(cli.jsonOut, JSON.stringify(report, null, 2) + "\n", "utf8");

  console.log(
    `[detect-drift] AUTO=${report.summary.auto} DRAFT=${report.summary.drafts} BLOCK=${report.summary.blocks} TOTAL=${report.summary.total}`,
  );

  if (cli.dryRun) return;

  // Modo --ci
  if (report.summary.blocks > 0) {
    console.error(
      `[detect-drift] ${report.summary.blocks} drift(s) BLOCK detectado(s). Falhando o CI.`,
    );
    process.exit(1);
  }

  // TODO(M3): chamar apply-auto.ts
  // TODO(M4): chamar generate-drafts.ts
}

run().catch((e) => {
  console.error("[detect-drift] erro fatal:", e);
  process.exit(2);
});
