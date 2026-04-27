import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ArticleWithCategory } from "@/modules/knowledge-base";

type Props = {
  articles: ArticleWithCategory[];
  companySlug: string;
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

export function ArticleList({ articles, companySlug }: Props) {
  if (articles.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">Nenhum artigo encontrado.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {articles.map((article) => {
        const { label, variant } = statusLabel(article.status ?? "draft");
        return (
          <li key={article.id}>
            <Link href={`/${companySlug}/manual/artigo/${article.slug}`} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{article.title}</CardTitle>
                    <Badge variant={variant} className="shrink-0">
                      {label}
                    </Badge>
                  </div>
                  {article.category && (
                    <p className="text-xs text-muted-foreground">{article.category.title}</p>
                  )}
                </CardHeader>
                {article.summary && (
                  <CardContent className="pt-0">
                    <p className="line-clamp-2 text-sm text-muted-foreground">{article.summary}</p>
                  </CardContent>
                )}
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
