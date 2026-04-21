"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { movementSchema } from "../schemas";
import { validateMovement } from "../services/stock-service";
import type { ActionResult } from "@/lib/errors";

export async function registerMovementAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = movementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  // Pré-validação de saldo (melhora UX — banco valida novamente via trigger)
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("stock")
    .eq("id", parsed.data.productId)
    .single();

  if (pErr || !product) {
    return { ok: false, message: "Produto não encontrado" };
  }

  try {
    validateMovement(parsed.data, Number(product.stock));
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  const { error } = await supabase.from("stock_movements").insert({
    product_id: parsed.data.productId,
    movement_type: parsed.data.type,
    quantity: parsed.data.quantity,
    unit_cost: parsed.data.unitCost ?? null,
    reason: parsed.data.reason ?? null,
    performed_by: user.id,
  });

  if (error) {
    // Captura exceção do trigger (estoque insuficiente no banco)
    if (error.message.includes("Estoque insuficiente")) {
      return { ok: false, message: "Estoque insuficiente para realizar a saída" };
    }
    return { ok: false, message: error.message };
  }

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  return { ok: true, message: "Movimentação registrada com sucesso" };
}
