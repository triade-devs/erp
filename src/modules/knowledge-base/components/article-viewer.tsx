import { Badge } from "@/components/ui/badge";
import type { ArticleWithCategory } from "@/modules/knowledge-base";

type Props = {
  article: ArticleWithCategory;
};

function statusLabel(status: string): {
  label: string;
  variant: "secondary" | "default" | "outline";
} {
  switch (status) {
    case "published":
      return { label: "Publicado", variant: "default" };
    case "archived":
      return { label: "Arquivado", variant: "outline" };
    default:
      return { label: "Rascunho", variant: "secondary" };
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export function ArticleViewer({ article }: Props) {
  const { label, variant } = statusLabel(article.status ?? "draft");

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold leading-tight">{article.title}</h1>
          <Badge variant={variant}>{label}</Badge>
        </div>

        {article.category && (
          <nav aria-label="Categoria">
            <span className="text-sm text-muted-foreground">
              Categoria: <span className="font-medium">{article.category.title}</span>
            </span>
          </nav>
        )}

        {article.summary && <p className="text-base text-muted-foreground">{article.summary}</p>}

        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {article.status === "published" && article.published_at && (
            <div>
              <dt className="inline">Publicado em: </dt>
              <dd className="inline">{formatDate(article.published_at)}</dd>
            </div>
          )}
          <div>
            <dt className="inline">Criado em: </dt>
            <dd className="inline">{formatDate(article.created_at)}</dd>
          </div>
          <div>
            <dt className="inline">Atualizado em: </dt>
            <dd className="inline">{formatDate(article.updated_at)}</dd>
          </div>
        </dl>
      </header>

      <hr className="border-border" />

      {article.content_md ? (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
            {article.content_md}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Este artigo não possui conteúdo.</p>
      )}
    </article>
  );
}
