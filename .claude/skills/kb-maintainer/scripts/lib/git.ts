import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

/**
 * Pequeno wrapper de git para a skill. Nada exótico — só padroniza
 * a chamada com `cwd` no repo root e retorna stdout limpo.
 */
export async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await exec("git", args, { cwd });
  return stdout.trim();
}

export async function changedFiles(cwd: string, base = "origin/main"): Promise<string[]> {
  const out = await git(["diff", "--name-only", `${base}...HEAD`], cwd);
  return out.split("\n").filter(Boolean);
}
