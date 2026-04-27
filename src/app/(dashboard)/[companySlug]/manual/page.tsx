import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { listArticles, listCategories, ArticleList, CategoryTree } from "@/modules/knowledge-base";

export const metadata = { title: "Manual — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function ManualPage({ params, searchParams }: Props) {
  const { companySlug } = await params;
  const { category: categorySlug } = await searchParams;

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

  let canWrite = false;
  try {
    await requirePermission(company.id, "kb:article:write");
    canWrite = true;
  } catch {
    // sem permissão de escrita — apenas leitura
  }

  const [allArticles, categories] = await Promise.all([
    listArticles(company.id, { status: "published" }),
    listCategories(company.id),
  ]);

  // Filtrar por categoria selecionada
  let selectedCategoryId: string | undefined;
  if (categorySlug) {
    const found = categories.find((c) => c.slug === categorySlug);
    selectedCategoryId = found?.id;
  }

  const articles = selectedCategoryId
    ? allArticles.filter((a) => a.category_id === selectedCategoryId)
    : allArticles;

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manual — {company.name}</h1>
          <p className="text-sm text-muted-foreground">Base de conhecimento da empresa</p>
        </div>
        {canWrite && (
          <Link
            href={`/${companySlug}/manual/editor`}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Gerenciar artigos
          </Link>
        )}
      </header>

      <div className="flex gap-6">
        {/* Sidebar de categorias */}
        <aside className="w-48 shrink-0">
          <CategoryTree
            categories={categories}
            companySlug={companySlug}
            selectedCategoryId={selectedCategoryId}
          />
        </aside>

        {/* Lista de artigos */}
        <main className="min-w-0 flex-1">
          <ArticleList articles={articles} companySlug={companySlug} />
        </main>
      </div>
    </section>
  );
}
