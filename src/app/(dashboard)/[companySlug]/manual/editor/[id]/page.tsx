import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { listArticles, listCategories, ArticleEditor, PublishForm } from "@/modules/knowledge-base";

type Props = {
  params: Promise<{ companySlug: string; id: string }>;
};

export default async function EditorArticlePage({ params }: Props) {
  const { companySlug, id } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "kb:article:write");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para editar artigos.
        </div>
      );
    }
    throw e;
  }

  const isCreate = id === "novo";

  const [allArticles, categories] = await Promise.all([
    isCreate ? Promise.resolve([]) : listArticles(company.id),
    listCategories(company.id),
  ]);

  const article = isCreate ? null : (allArticles.find((a) => a.id === id) ?? null);

  if (!isCreate && !article) notFound();

  let canPublish = false;
  if (!isCreate) {
    try {
      await requirePermission(company.id, "kb:article:publish");
      canPublish = true;
    } catch {
      // sem permissão de publicação
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{isCreate ? "Novo artigo" : "Editar artigo"}</h1>
          <Link
            href={`/${companySlug}/manual/editor`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Voltar para lista de artigos
          </Link>
        </div>

        {/* Controles de publicação — apenas em modo edição com permissão */}
        {!isCreate && article && canPublish && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Status: {article.status === "published" ? "Publicado" : "Rascunho"}
            </span>
            <PublishForm articleId={article.id} isPublished={article.status === "published"} />
          </div>
        )}
      </header>

      <ArticleEditor companySlug={companySlug} article={article} categories={categories} />
    </section>
  );
}
