import { getServiceClient, scrub } from "../lib/supabase.js";

/**
 * Lê o estado dos artigos da tabela kb_articles. Usado pelos detectores
 * que comparam estado do banco com o do código.
 *
 * TODO(M5): implementar de fato. Hoje retorna [] silenciosamente para
 * a skill rodar antes do módulo KB existir.
 */
export interface KbArticleSummary {
  id: string;
  slug: string;
  status: "draft" | "published" | "archived";
  related_table: string | null;
  related_module: string | null;
  content_md_hash: string;
}

export async function listKbArticles(): Promise<KbArticleSummary[]> {
  const required = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!required) return [];
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from("kb_articles")
      .select("id, slug, status, related_table, related_module, content_md");
    if (error) throw error;
    if (!data) return [];
    // TODO(M5): hash de content_md para detectar staleness de embeddings.
    return data.map((r) => ({
      id: String(r.id),
      slug: String(r.slug),
      status: r.status as KbArticleSummary["status"],
      related_table: (r.related_table as string | null) ?? null,
      related_module: (r.related_module as string | null) ?? null,
      content_md_hash: "",
    }));
  } catch (e) {
    const msg = e instanceof Error ? scrub(e.message) : String(e);
    // tabela ainda não existe (pré-F1) → sem alvo a comparar
    if (msg.includes('relation "kb_articles" does not exist') || msg.includes("does not exist"))
      return [];
    throw new Error(`Falha lendo kb_articles: ${msg}`);
  }
}
