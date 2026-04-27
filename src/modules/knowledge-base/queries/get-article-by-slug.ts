import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ArticleWithCategory } from "../types";

export async function getArticleBySlug(
  companyId: string,
  slug: string,
): Promise<ArticleWithCategory | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("kb_articles")
    .select("*, category:kb_categories(*)")
    .eq("company_id", companyId)
    .eq("slug", slug)
    .single();

  if (error) return null;
  return data as ArticleWithCategory;
}
