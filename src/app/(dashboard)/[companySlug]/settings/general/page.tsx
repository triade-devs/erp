import { notFound } from "next/navigation";
import { resolveCompany } from "@/modules/tenancy";
import { hasPermission } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { CompanySettingsForm } from "./company-settings-form";

type Props = {
  params: Promise<{ companySlug: string }>;
};

export const metadata = { title: "Configurações Gerais — ERP" };

export default async function SettingsGeneralPage({ params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  const canUpdate = await hasPermission(company.id, "core:company:update");

  return (
    <section className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Dados da empresa</h2>
        <p className="text-sm text-muted-foreground">
          {canUpdate
            ? "Edite as informações da empresa abaixo."
            : "Você não tem permissão para editar os dados da empresa."}
        </p>
      </div>

      <CompanySettingsForm company={company} readOnly={!canUpdate} />
    </section>
  );
}
