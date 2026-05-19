"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";
import type { Json } from "@/types/database.types";
import { createArticleSchema } from "../schemas/article";
import { generateSlug, ensureUniqueSlug } from "../services/slug-service";
import type { KbArticleContent, KbArticleInsert } from "../types";

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

export async function createArticleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const rawData: Record<string, unknown> = Object.fromEntries(formData);

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

  const parsed = createArticleSchema.safeParse(rawData);
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

  // Generate unique slug
  const baseSlug = generateSlug(parsed.data.title);
  const { data: existingRows, error: slugFetchError } = await supabase
    .from("kb_articles")
    .select("slug")
    .eq("company_id", companyId);

  if (slugFetchError) return { ok: false, message: slugFetchError.message };

  const existingSlugs = (existingRows ?? []).map((r) => r.slug);
  const slug = ensureUniqueSlug(baseSlug, existingSlugs);

  const payload: KbArticleInsert = {
    company_id: companyId,
    title: parsed.data.title,
    slug,
    summary: parsed.data.summary ?? null,
    content_json: parsed.data.content_json,
    content_md: parsed.data.content_md,
    category_id: parsed.data.category_id ?? null,
    audience: parsed.data.audience,
    related_module: parsed.data.related_module ?? null,
    related_table: parsed.data.related_table ?? null,
    status: "draft",
    created_by: user.id,
    updated_by: user.id,
  };

  const { error } = await supabase.from("kb_articles").insert(payload);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/", "layout");
  return { ok: true, message: "Artigo criado com sucesso" };
}
