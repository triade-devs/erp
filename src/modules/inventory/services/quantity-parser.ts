export type ProductUnit = "UN" | "KG" | "L" | "CX" | "M";

/**
 * Deriva a unidade (UN/KG/L/CX/M) a partir do campo `quantity` do Open Food Facts
 * ("395 g", "1 L", "500 ml", "6 x 1 L"). Avaliação ordenada: a primeira regra que
 * casar vence, porque um multipack ("6 x 1 L") casaria também com litro.
 */
export function unitFromQuantity(quantity: string): ProductUnit {
  const q = quantity.toLowerCase().trim();
  if (!q) return "UN";
  if (/\d\s*x\s*\d/.test(q)) return "CX"; // multipack
  if (/(kg|g)\b/.test(q)) return "KG";
  if (/(ml|l)\b/.test(q)) return "L";
  return "UN";
}
