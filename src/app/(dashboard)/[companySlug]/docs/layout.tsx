import { notFound } from "next/navigation";
import Link from "next/link";
import { type ReactNode } from "react";
import { resolveCompany } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";

type Props = {
  params: Promise<{ companySlug: string }>;
  children: ReactNode;
};

const NAV_SECTIONS = [
  {
    label: "Arquitetura",
    links: [{ label: "Visão Geral", href: "/docs/arquitetura/visao-geral" }],
  },
  {
    label: "Módulos",
    links: [{ label: "Inventory", href: "/docs/modulos/inventory" }],
  },
  {
    label: "Tabelas",
    links: [{ label: "products", href: "/docs/tabelas/products" }],
  },
];

export default async function DocsLayout({ params, children }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "kb:doc:read");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para acessar a documentação.
        </div>
      );
    }
    throw e;
  }

  return (
    <div className="flex gap-6">
      <aside className="w-52 shrink-0">
        <nav className="space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={`/${companySlug}${link.href}`}
                      className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="prose prose-sm dark:prose-invert min-w-0 max-w-none flex-1">{children}</main>
    </div>
  );
}
