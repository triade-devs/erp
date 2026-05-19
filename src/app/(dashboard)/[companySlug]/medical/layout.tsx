import type { ReactNode } from "react";
import { AppError } from "@/lib/errors";
import { MedicalModuleNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  children: ReactNode;
  params: Promise<{ companySlug: string }>;
};

export default async function MedicalLayout({ children, params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) {
      return <div className="p-8 text-center text-muted-foreground">{e.message}</div>;
    }
    throw e;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Prontuário — {company.name}</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhamento clínico e carteira de pacientes
        </p>
      </div>

      <MedicalModuleNav companySlug={companySlug} />

      {children}
    </div>
  );
}
