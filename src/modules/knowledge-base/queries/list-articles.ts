import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ArticleWithCategory, KbArticleStatus } from "../types";

export async function listArticles(
  companyId: string,
  opts?: {
    status?: KbArticleStatus;
    categoryId?: string;
    limit?: number;
    offset?: number;
  },
): Promise<ArticleWithCategory[]> {
  const limit = Math.min(opts?.limit ?? 20, 100);
  const offset = opts?.offset ?? 0;

  const supabase = await createClient();
  let query = supabase
    .from("kb_articles")
    .select("*, category:kb_categories(*)")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (opts?.status) query = query.eq("status", opts.status);
  if (opts?.categoryId) query = query.eq("category_id", opts.categoryId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []) as ArticleWithCategory[];
}
