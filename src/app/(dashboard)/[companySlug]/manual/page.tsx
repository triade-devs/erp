import { notFound } from "next/navigation";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Manual — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function ManualPage({ params }: Props) {
  const { companySlug } = await params;

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

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Manual — {company.name}</h1>
        <p className="text-sm text-muted-foreground">
          Base de conhecimento em construção. Em breve disponível.
        </p>
      </header>
    </section>
  );
}
