import type { ReactNode } from "react";
import { resolveCompany } from "@/modules/tenancy";
import { AppError } from "@/lib/errors";
import { SettingsTabs } from "./settings-tabs";

type Props = {
  children: ReactNode;
  params: Promise<{ companySlug: string }>;
};

export default async function SettingsLayout({ children, params }: Props) {
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
        <h1 className="text-2xl font-semibold">Configurações — {company.name}</h1>
        <p className="text-sm text-muted-foreground">Gerencie os dados e membros da empresa</p>
      </div>

      <SettingsTabs slug={companySlug} />

      {children}
    </div>
  );
}
