import type { MovementInput } from "../schemas";

export class InsufficientStockError extends Error {
  constructor(productId: string) {
    super(`Estoque insuficiente para o produto: ${productId}`);
    this.name = "InsufficientStockError";
  }
}

/**
 * Valida localmente antes de chamar o banco (melhora UX).
 * O banco tem a verdade final via trigger `trg_apply_stock_movement`.
 */
export function validateMovement(input: MovementInput, currentStock: number): void {
  if (input.type === "out" && input.quantity > currentStock) {
    throw new InsufficientStockError(input.productId);
  }
}

/**
 * Calcula o novo saldo esperado após a movimentação (para preview na UI).
 */
export function calculateNewStock(
  currentStock: number,
  movementType: MovementInput["type"],
  quantity: number,
): number {
  switch (movementType) {
    case "in":
      return currentStock + quantity;
    case "out":
      return currentStock - quantity;
    case "adjustment":
      return quantity;
  }
}
