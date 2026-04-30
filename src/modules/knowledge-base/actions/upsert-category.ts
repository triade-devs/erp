"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getActiveCompanyId } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import type { ActionResult } from "@/lib/errors";
import { categorySchema } from "../schemas/category";
import { generateSlug, ensureUniqueSlug } from "../services/slug-service";

export async function upsertCategoryAction(
  id: string | null,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
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

  // Resolve slug: use provided or auto-generate from title
  let slug = parsed.data.slug ?? "";
  if (!slug) {
    const baseSlug = generateSlug(parsed.data.title);
    const query = supabase.from("kb_categories").select("slug").eq("company_id", companyId);
    // Exclude current record on updates to allow keeping same slug
    const { data: existingRows, error: slugFetchError } = id
      ? await query.neq("id", id)
      : await query;
    if (slugFetchError) return { ok: false, message: slugFetchError.message };
    const existing = (existingRows ?? []).map((r) => r.slug);
    slug = ensureUniqueSlug(baseSlug, existing);
  }

  if (id) {
    // Update
    const { error } = await supabase
      .from("kb_categories")
      .update({
        title: parsed.data.title,
        slug,
        parent_id: parsed.data.parent_id ?? null,
        audience: parsed.data.audience,
        position: parsed.data.position,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) return { ok: false, message: error.message };
  } else {
    // Insert
    const { error } = await supabase.from("kb_categories").insert({
      company_id: companyId,
      title: parsed.data.title,
      slug,
      parent_id: parsed.data.parent_id ?? null,
      audience: parsed.data.audience,
      position: parsed.data.position,
    });

    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Categoria atualizada" : "Categoria criada" };
}
