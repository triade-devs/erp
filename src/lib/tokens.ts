import { randomBytes, createHash } from "node:crypto";

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function generateShortCode(prefix: "INV" | "RST"): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return `${prefix}-${out.slice(0, 4)}-${out.slice(4)}`;
}

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

/** Retorna o hash em formato \x<hex> para inserção em colunas bytea via PostgREST */
export function hashTokenHex(token: string): string {
  return `\\x${createHash("sha256").update(token).digest("hex")}`;
}

export function compareTokenHash(plain: string, stored: Buffer): boolean {
  return hashToken(plain).equals(stored);
}
