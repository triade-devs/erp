import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { getSpace, updateSpaceAction, SpaceForm } from "@/modules/spaces";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Editar Espaço — ERP" };

type Props = {
  params: Promise<{ companySlug: string; spaceId: string }>;
};

export default async function EditSpacePage({ params }: Props) {
  const { companySlug, spaceId } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "spaces:space:manage");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para editar espaços.
        </div>
      );
    }
    throw e;
  }

  const space = await getSpace(company.id, spaceId);
  if (!space) notFound();

  const updateAction = updateSpaceAction.bind(null, spaceId);

  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Editar Espaço</h1>
          <p className="text-sm text-muted-foreground">{space.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/${companySlug}/spaces/${spaceId}`}>Cancelar</Link>
        </Button>
      </header>

      <div className="rounded-lg border bg-card p-6">
        <SpaceForm space={space} updateAction={updateAction} />
      </div>
    </section>
  );
}
