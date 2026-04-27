"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";

export async function publishArticleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const id = formData.get("id");
  if (!id || typeof id !== "string") {
    return { ok: false, message: "ID do artigo obrigatório" };
  }

  const action = formData.get("action");
  if (action !== "publish" && action !== "unpublish") {
    return { ok: false, message: "Ação inválida. Use 'publish' ou 'unpublish'" };
  }

  const companyId = await getActiveCompanyId();
  if (!companyId) return { ok: false, message: "Nenhuma empresa ativa" };

  try {
    await requirePermission(companyId, "kb:article:publish");
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

  const updatePayload =
    action === "publish"
      ? {
          status: "published",
          published_at: new Date().toISOString(),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        }
      : {
          status: "draft",
          published_at: null,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        };

  const { data, error } = await supabase
    .from("kb_articles")
    .update(updatePayload)
    .eq("id", id)
    .eq("company_id", companyId)
    .select("id")
    .single();

  if (error || !data) return { ok: false, message: "Artigo não encontrado" };

  revalidatePath("/", "layout");
  return { ok: true, message: action === "publish" ? "Artigo publicado" : "Artigo despublicado" };
}
