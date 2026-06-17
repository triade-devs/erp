import "server-only";

import { notFound, redirect } from "next/navigation";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { AnestesiaClientPage } from "@/modules/anestesia";

export const metadata = { title: "Anestesia — ERP" };

type Props = { params: Promise<{ companySlug: string }> };

export default async function AnestesiaPage({ params }: Props) {
  const { companySlug } = await params;

  let company;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "anestesia:ficha:read");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/sem-acesso");
    throw e;
  }

  return <AnestesiaClientPage />;
}
