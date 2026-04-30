import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Manifest } from "../types.js";

/**
 * O manifesto vive em `.kb-maintainer/manifest.json` (gitignored) e mapeia
 * cada arquivo-fonte ao seu hash sha256, e cada artigo de doc ao hash do
 * conteúdo + a lista de fontes que o originaram.
 *
 * Por que hash e não timestamp? Porque queremos idempotência total: rodar a
 * skill 3x sem mudanças no código deve gerar zero diff.
 */

const MANIFEST_PATH = ".kb-maintainer/manifest.json";

export function sha256(content: string | Buffer): string {
  return "sha256-" + createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export async function hashFile(path: string): Promise<string> {
  const buf = await readFile(path);
  return sha256(buf);
}

export async function loadManifest(repoRoot: string): Promise<Manifest> {
  const path = join(repoRoot, MANIFEST_PATH);
  if (!existsSync(path)) {
    return { version: 1, generated_at: new Date().toISOString(), sources: {}, targets: {} };
  }
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as Manifest;
}

export async function saveManifest(repoRoot: string, manifest: Manifest): Promise<void> {
  const path = join(repoRoot, MANIFEST_PATH);
  await mkdir(dirname(path), { recursive: true });
  manifest.generated_at = new Date().toISOString();
  await writeFile(path, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

/** Compara hash atual vs o do manifesto. Retorna `true` se mudou. */
export function isStale(
  manifest: Manifest,
  kind: "sources" | "targets",
  key: string,
  currentHash: string,
): boolean {
  const entry = manifest[kind][key];
  if (!entry) return true;
  return (typeof entry === "string" ? entry : entry.hash) !== currentHash;
}
