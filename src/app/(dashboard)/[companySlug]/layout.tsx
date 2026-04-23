import { resolveCompany } from "@/modules/tenancy";
import { getEffectivePermissions, PermissionsProvider } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import type { ReactNode } from "react";

export default async function CompanyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;

  let perms: Set<string>;
  try {
    const company = await resolveCompany(companySlug);
    perms = await getEffectivePermissions(company.id);
  } catch (e) {
    if (e instanceof AppError) {
      return <div className="p-8 text-center text-muted-foreground">{e.message}</div>;
    }
    throw e;
  }

  return <PermissionsProvider permissions={[...perms]}>{children}</PermissionsProvider>;
}
