import { resolveCompany } from "@/modules/tenancy";
import { getEffectivePermissions, PermissionsProvider, getUserFieldModes } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import type { ReactNode } from "react";
import type { UserFieldModes } from "@/modules/authz";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  let perms: Set<string>;
  let fieldModes: UserFieldModes;
  try {
    const company = await resolveCompany(companySlug);
    [perms, fieldModes] = await Promise.all([
      getEffectivePermissions(company.id),
      getUserFieldModes(company.id),
    ]);
  } catch (e) {
    if (e instanceof AppError) {
      return <div className="p-8 text-center text-muted-foreground">{e.message}</div>;
    }
    throw e;
  }

  return (
    <PermissionsProvider permissions={[...perms]} fieldModes={fieldModes}>
      {children}
    </PermissionsProvider>
  );
}
