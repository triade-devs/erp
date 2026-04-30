#!/usr/bin/env tsx
/**
 * validate-phase — roda a checklist de uma fase do plano da KB.
 *
 * Uso:
 *   npx tsx scripts/validate-phase.ts --phase F0
 *   npx tsx scripts/validate-phase.ts --phase F1 --json-out report.json
 *   npx tsx scripts/validate-phase.ts --all   # roda todas as fases que têm pré-requisitos atendidos
 *
 * Saída: relatório markdown em stdout (e --json-out se passado).
 * Exit code: 0 se passou, 1 se faltou check obrigatório, 2 em erro fatal.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, readdir, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { CheckResult, PhaseCheck, PhaseChecklist, PhaseReport } from "./phases.js";
import { PHASES } from "../phases/index.js";
import { getServiceClient, scrub } from "./lib/supabase.js";

const exec = promisify(execFile);

interface Cli {
  phase?: PhaseChecklist["id"];
  all: boolean;
  jsonOut?: string;
  reportPath?: string;
}

function parseCli(argv: string[]): Cli {
  const cli: Cli = { all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--phase") cli.phase = argv[++i] as PhaseChecklist["id"];
    else if (a === "--all") cli.all = true;
    else if (a === "--json-out") cli.jsonOut = argv[++i];
    else if (a === "--report-path") cli.reportPath = argv[++i];
  }
  return cli;
}

const REPO_ROOT = resolve(process.cwd(), "../../..");

// ---------- Implementação dos kinds ----------

async function checkFileExists(glob: string): Promise<{ ok: boolean; evidence: string }> {
  const matches = await expandGlob(REPO_ROOT, glob);
  return matches.length > 0
    ? {
        ok: true,
        evidence: `match: ${matches[0]}${matches.length > 1 ? ` (+${matches.length - 1})` : ""}`,
      }
    : { ok: false, evidence: `nenhum arquivo casa com '${glob}'` };
}

async function checkFileContains(
  path: string,
  pattern: string,
): Promise<{ ok: boolean; evidence: string }> {
  const re = new RegExp(pattern, "i");
  const target = join(REPO_ROOT, path);
  if (!existsSync(target)) return { ok: false, evidence: `path inexistente: ${path}` };
  const s = await stat(target);
  // Se for diretório, varre arquivos .sql/.ts/.tsx/.md
  if (s.isDirectory()) {
    const files = await listFilesRecursive(target);
    for (const f of files) {
      const txt = await readFile(f, "utf8").catch(() => "");
      if (re.test(txt)) return { ok: true, evidence: `match em ${f.replace(REPO_ROOT + "/", "")}` };
    }
    return { ok: false, evidence: `padrão '${pattern}' não encontrado em ${path}` };
  }
  const txt = await readFile(target, "utf8");
  return re.test(txt)
    ? { ok: true, evidence: `padrão casa em ${path}` }
    : { ok: false, evidence: `padrão '${pattern}' não encontrado em ${path}` };
}

async function checkPackageJsonHas(
  dep: string,
  section?: "dependencies" | "devDependencies",
): Promise<{ ok: boolean; evidence: string }> {
  const pkgPath = join(REPO_ROOT, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as Record<string, Record<string, string>>;
  const sections = section ? [section] : ["dependencies", "devDependencies"];
  for (const sec of sections) {
    const v = pkg[sec]?.[dep];
    if (v) return { ok: true, evidence: `${sec}: ${dep}@${v}` };
  }
  return { ok: false, evidence: `${dep} ausente em ${sections.join("/")}` };
}

async function checkMenuHasPermission(
  permission: string,
): Promise<{ ok: boolean; evidence: string }> {
  const path = join(REPO_ROOT, "src/core/navigation/menu.ts");
  if (!existsSync(path)) return { ok: false, evidence: "menu.ts não encontrado" };
  const txt = await readFile(path, "utf8");
  return txt.includes(permission)
    ? { ok: true, evidence: `'${permission}' presente em menu.ts` }
    : { ok: false, evidence: `'${permission}' não está em menu.ts` };
}

async function checkPermissionsPresent(
  perms: string[],
): Promise<{ ok: boolean; evidence: string }> {
  const dir = join(REPO_ROOT, "supabase/migrations");
  const files = await readdir(dir).catch(() => []);
  let corpus = "";
  for (const f of files) {
    if (!f.endsWith(".sql")) continue;
    corpus += await readFile(join(dir, f), "utf8");
  }
  const missing = perms.filter((p) => !corpus.includes(p));
  return missing.length === 0
    ? { ok: true, evidence: `${perms.length} permissões presentes nas migrations` }
    : { ok: false, evidence: `faltam: ${missing.join(", ")}` };
}

async function checkBarrelExports(
  module: string,
  exports: string[],
): Promise<{ ok: boolean; evidence: string }> {
  const path = join(REPO_ROOT, "src/modules", module, "index.ts");
  if (!existsSync(path))
    return { ok: false, evidence: `barrel inexistente em src/modules/${module}/index.ts` };
  const txt = await readFile(path, "utf8");
  const missing = exports.filter((e) => !new RegExp(`\\b${e}\\b`).test(txt));
  return missing.length === 0
    ? { ok: true, evidence: `${exports.length} exports presentes` }
    : { ok: false, evidence: `faltam exports: ${missing.join(", ")}` };
}

async function checkShell(command: string): Promise<{ ok: boolean; evidence: string }> {
  try {
    await exec("bash", ["-lc", command], { cwd: REPO_ROOT, timeout: 120_000 });
    return { ok: true, evidence: `\`${command}\` exit=0` };
  } catch (e) {
    const code = (e as { code?: number }).code ?? 1;
    return { ok: false, evidence: `\`${command}\` exit=${code}` };
  }
}

async function checkSupabaseTableExists(table: string): Promise<{ ok: boolean; evidence: string }> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, evidence: "SUPABASE_URL/SERVICE_ROLE_KEY ausentes — check pulado" };
  }
  try {
    const sb = getServiceClient();
    const { error } = await sb.from(table).select("*", { count: "exact", head: true });
    if (error) return { ok: false, evidence: scrub(error.message) };
    return { ok: true, evidence: `tabela ${table} responde` };
  } catch (e) {
    return { ok: false, evidence: scrub(e instanceof Error ? e.message : String(e)) };
  }
}

// ---------- Dispatcher ----------

async function runCheck(c: PhaseCheck): Promise<CheckResult> {
  let r: { ok: boolean; evidence: string };
  try {
    switch (c.kind) {
      case "file-exists":
        r = await checkFileExists(c.glob);
        break;
      case "file-contains":
        r = await checkFileContains(c.path, c.pattern);
        break;
      case "package-json-has":
        r = await checkPackageJsonHas(c.dep, c.section);
        break;
      case "menu-has-permission":
        r = await checkMenuHasPermission(c.permission);
        break;
      case "permissions-present":
        r = await checkPermissionsPresent(c.permissions);
        break;
      case "barrel-exports":
        r = await checkBarrelExports(c.module, c.exports);
        break;
      case "shell":
        r = await checkShell(c.command);
        break;
      case "supabase-table-exists":
        r = await checkSupabaseTableExists(c.table);
        break;
      default: {
        const _exhaustive: never = c;
        r = { ok: false, evidence: `kind desconhecido` };
      }
    }
  } catch (e) {
    r = { ok: false, evidence: `erro: ${e instanceof Error ? e.message : String(e)}` };
  }
  return {
    id: c.id,
    description: c.description,
    passed: r.ok,
    optional: !!c.optional,
    evidence: r.evidence,
  };
}

async function runPhase(phase: PhaseChecklist): Promise<PhaseReport> {
  const results: CheckResult[] = [];
  for (const c of phase.checks) {
    results.push(await runCheck(c));
  }
  const passed_count = results.filter((r) => r.passed).length;
  const failed_required = results.filter((r) => !r.passed && !r.optional).length;
  const failed_optional = results.filter((r) => !r.passed && r.optional).length;
  return {
    phase: phase.id,
    name: phase.name,
    generated_at: new Date().toISOString(),
    passed: failed_required === 0,
    total: results.length,
    passed_count,
    failed_required,
    failed_optional,
    results,
  };
}

function renderReport(report: PhaseReport): string {
  const icon = report.passed ? "✅" : "❌";
  const lines = [
    `## ${icon} Phase Gate · ${report.phase} — ${report.name}`,
    "",
    `**${report.passed_count}/${report.total} checagens passaram** ` +
      `(${report.failed_required} obrigatórias falhando, ${report.failed_optional} opcionais).`,
    "",
    `| Status | Check | Detalhe |`,
    `|---|---|---|`,
  ];
  for (const r of report.results) {
    const i = r.passed ? "✅" : r.optional ? "⚠️" : "❌";
    lines.push(`| ${i} | \`${r.id}\` — ${r.description} | ${r.evidence} |`);
  }
  return lines.join("\n");
}

// ---------- Helpers ----------

async function expandGlob(root: string, glob: string): Promise<string[]> {
  // Glob mínimo: suporta * e ** com segmentos
  const parts = glob.split("/");
  let candidates: string[] = [root];
  for (const seg of parts) {
    const next: string[] = [];
    for (const dir of candidates) {
      const entries = await readdir(dir).catch(() => [] as string[]);
      if (seg === "**") {
        next.push(dir);
        for (const e of entries) {
          const sub = join(dir, e);
          const s = await stat(sub).catch(() => null);
          if (s?.isDirectory()) {
            const recursed = await expandGlob(
              sub,
              "**/" + parts.slice(parts.indexOf(seg) + 1).join("/"),
            );
            recursed.forEach((p) => next.push(p));
          }
        }
      } else if (seg.includes("*")) {
        const re = new RegExp(
          "^" + seg.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
        );
        for (const e of entries) {
          if (re.test(e)) next.push(join(dir, e));
        }
      } else {
        next.push(join(dir, seg));
      }
    }
    candidates = [...new Set(next)];
  }
  // mantém só os que existem como arquivo
  const out: string[] = [];
  for (const c of candidates) {
    const s = await stat(c).catch(() => null);
    if (s?.isFile()) out.push(c.replace(root + "/", ""));
  }
  return out;
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir).catch(() => []);
  for (const e of entries) {
    const full = join(dir, e);
    const s = await stat(full).catch(() => null);
    if (!s) continue;
    if (s.isDirectory()) out.push(...(await listFilesRecursive(full)));
    else out.push(full);
  }
  return out;
}

// ---------- Main ----------

async function main() {
  const cli = parseCli(process.argv.slice(2));
  if (!cli.phase && !cli.all) {
    console.error("Uso: --phase F0|F1|F2|F3|F4|F5  ou  --all");
    process.exit(2);
  }

  const reports: PhaseReport[] = [];
  const phasesToRun: PhaseChecklist[] = cli.all ? Object.values(PHASES) : [PHASES[cli.phase!]];

  for (const phase of phasesToRun) {
    console.error(`[validate-phase] rodando ${phase.id} — ${phase.name}`);
    reports.push(await runPhase(phase));
  }

  const md = reports.map(renderReport).join("\n\n");
  console.log(md);

  if (cli.jsonOut) await writeFile(cli.jsonOut, JSON.stringify(reports, null, 2) + "\n", "utf8");
  if (cli.reportPath) await writeFile(cli.reportPath, md, "utf8");

  const anyFailed = reports.some((r) => !r.passed);
  process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => {
  console.error("[validate-phase] erro fatal:", e);
  process.exit(2);
});
