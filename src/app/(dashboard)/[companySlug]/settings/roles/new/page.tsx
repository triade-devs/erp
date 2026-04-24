import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { resolveCompany, createRoleAction } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { RoleForm } from "../role-form";

export const metadata = { title: "Nova Role — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function NewRolePage({ params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "core:role:manage");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      redirect(`/${companySlug}/settings/roles`);
    }
    throw e;
  }

  const action = createRoleAction.bind(null, company.id);

  return (
    <section className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${companySlug}/settings/roles`}>← Roles</Link>
        </Button>
        <h2 className="text-lg font-semibold">Nova role</h2>
      </div>

      <RoleForm
        action={action}
        backHref={`/${companySlug}/settings/roles`}
        submitLabel="Criar role"
      />
    </section>
  );
}
