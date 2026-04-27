import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { listArticles, listCategories, ArticleList } from "@/modules/knowledge-base";

export const metadata = { title: "Editor de Artigos — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function EditorPage({ params }: Props) {
  const { companySlug } = await params;

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
          Acesso negado: você não tem permissão para gerenciar artigos.
        </div>
      );
    }
    throw e;
  }

  const [articles, _categories] = await Promise.all([
    listArticles(company.id),
    listCategories(company.id),
  ]);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Editor de Artigos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todos os artigos da base de conhecimento
          </p>
        </div>
        <Link
          href={`/${companySlug}/manual/editor/novo`}
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          Novo artigo
        </Link>
      </header>

      <ArticleList articles={articles} companySlug={companySlug} />
    </section>
  );
}
