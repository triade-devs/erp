"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";
import type { Json } from "@/types/database.types";
import { updateArticleSchema } from "../schemas/article";
import type { KbArticleContent, KbArticleUpdate } from "../types";

function isJsonValue(value: unknown): value is Json {
  if (value === null) return true;
  if (["string", "number", "boolean"].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

function isKbArticleContent(value: unknown): value is KbArticleContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}

export async function updateArticleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { ok: false, message: "ID do artigo obrigatório" };
  }

  const rawData: Record<string, unknown> = Object.fromEntries(formData);
  delete rawData["id"];

  // Parse content_json from JSON string before schema validation
  if (typeof rawData.content_json === "string") {
    try {
      const content = JSON.parse(rawData.content_json);
      if (!isKbArticleContent(content)) {
        return { ok: false, fieldErrors: { content_json: ["JSON de conteúdo inválido"] } };
      }
      rawData.content_json = content;
    } catch {
      return { ok: false, fieldErrors: { content_json: ["JSON de conteúdo inválido"] } };
    }
  }

  const parsed = updateArticleSchema.safeParse(rawData);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Não autenticado" };

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "kb:article:write");
  } catch (e) {
    if (e instanceof ForbiddenError)
      return { ok: false, message: "Acesso negado: permissão insuficiente" };
    throw e;
  }

  const payload: KbArticleUpdate = {
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (parsed.data.title !== undefined) payload.title = parsed.data.title;
  if (parsed.data.summary !== undefined) payload.summary = parsed.data.summary ?? null;
  if (parsed.data.content_json !== undefined) payload.content_json = parsed.data.content_json;
  if (parsed.data.content_md !== undefined) payload.content_md = parsed.data.content_md;
  if (parsed.data.category_id !== undefined) payload.category_id = parsed.data.category_id ?? null;
  if (parsed.data.audience !== undefined) payload.audience = parsed.data.audience;
  if (parsed.data.related_module !== undefined) {
    payload.related_module = parsed.data.related_module ?? null;
  }
  if (parsed.data.related_table !== undefined) {
    payload.related_table = parsed.data.related_table ?? null;
  }

  const { data, error } = await supabase
    .from("kb_articles")
    .update(payload)
    .eq("id", id)
    .eq("company_id", companyId)
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: "Artigo não encontrado" };

  revalidatePath("/", "layout");
  return { ok: true, message: "Artigo atualizado com sucesso" };
}
