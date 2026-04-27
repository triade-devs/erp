import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { getArticleBySlug, ArticleViewer } from "@/modules/knowledge-base";

type Props = {
  params: Promise<{ companySlug: string; slug: string }>;
};

export default async function ArtigoPage({ params }: Props) {
  const { companySlug, slug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "kb:article:read");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para acessar o manual.
        </div>
      );
    }
    throw e;
  }

  const article = await getArticleBySlug(company.id, slug);
  if (!article) notFound();

  // Rascunhos só visíveis para quem tem permissão de escrita
  if (article.status !== "published") {
    let canWrite = false;
    try {
      await requirePermission(company.id, "kb:article:write");
      canWrite = true;
    } catch {
      // sem permissão de escrita
    }
    if (!canWrite) notFound();
  }

  let canWrite = false;
  try {
    await requirePermission(company.id, "kb:article:write");
    canWrite = true;
  } catch {
    // sem permissão de escrita
  }

  return (
    <section className="space-y-6">
      <nav className="flex items-center justify-between">
        <Link
          href={`/${companySlug}/manual`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Voltar ao manual
        </Link>
        {canWrite && (
          <Link
            href={`/${companySlug}/manual/editor/${article.id}`}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Editar
          </Link>
        )}
      </nav>

      <ArticleViewer article={article} />
    </section>
  );
}
