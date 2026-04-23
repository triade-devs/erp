import type { Enums } from "@/types/database.types";

type UserRole = Enums<"user_role">;

/**
 * Verifica se o role do usuário tem permissão de escrita em produtos.
 */
export function canWriteProducts(role: UserRole | undefined): boolean {
  return role === "admin" || role === "manager";
}

/**
 * Verifica se o usuário é administrador.
 */
export function isAdmin(role: UserRole | undefined): boolean {
  return role === "admin";
}
