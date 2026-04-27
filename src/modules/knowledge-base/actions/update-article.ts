"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";
import type { Json } from "@/types/database.types";
import { updateArticleSchema } from "../schemas/article";

export async function updateArticleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { ok: false, message: "ID do artigo obrigatório" };
  }

  const rawData = Object.fromEntries(formData);
  delete rawData["id"];

  // Parse content_json from JSON string before schema validation
  if (typeof rawData.content_json === "string") {
    try {
      rawData.content_json = JSON.parse(rawData.content_json) as unknown as string;
    } catch {
      return { ok: false, fieldErrors: { content_json: ["JSON de conteúdo inválido"] } };
    }
  }

  const parsed = updateArticleSchema.safeParse(rawData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "kb:article:write");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const { content_json, ...rest } = parsed.data;

  const { error } = await supabase
    .from("kb_articles")
    .update({
      ...rest,
      ...(content_json !== undefined ? { content_json: content_json as Json } : {}),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Artigo atualizado com sucesso" };
}
