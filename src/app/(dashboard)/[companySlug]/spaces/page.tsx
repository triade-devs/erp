import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError, Can } from "@/modules/authz";
import { listSpaces, SpaceTable } from "@/modules/spaces";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Espaços — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<Record<string, string>>;
};

export default async function SpacesPage({ params, searchParams }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "spaces:space:read");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para ver os espaços.
        </div>
      );
    }
    throw e;
  }

  const rawParams = await searchParams;
  const { data, total } = await listSpaces(company.id, rawParams);

  const basePath = `/${companySlug}/spaces`;
  const createHref = `${basePath}/new`;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Espaços — {company.name}</h1>
          <p className="text-sm text-muted-foreground">{total} espaços cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`${basePath}/calendar`}>Calendário geral</Link>
          </Button>
          <Can permission="spaces:space:manage">
            <Button asChild>
              <Link href={createHref}>+ Novo espaço</Link>
            </Button>
          </Can>
        </div>
      </header>

      <form className="flex gap-2">
        <Input
          name="q"
          defaultValue={rawParams.q ?? ""}
          placeholder="Buscar por nome ou localização..."
          className="max-w-sm"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <Can
        permission="spaces:space:manage"
        fallback={<SpaceTable spaces={data} basePath={basePath} searchQuery={rawParams.q} />}
      >
        <SpaceTable
          spaces={data}
          basePath={basePath}
          searchQuery={rawParams.q}
          createHref={createHref}
          canManage
        />
      </Can>
    </section>
  );
}
