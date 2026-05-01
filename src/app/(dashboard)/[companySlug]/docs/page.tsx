import Link from "next/link";

type Props = {
  params: Promise<{ companySlug: string }>;
};

const SECTIONS = [
  {
    label: "Arquitetura",
    description: "Visão geral do sistema, stack, princípios e decisões de design.",
    links: [{ label: "Visão Geral", href: "arquitetura/visao-geral" }],
  },
  {
    label: "Módulos",
    description: "Documentação de cada módulo: ações, queries, permissões e integrações.",
    links: [{ label: "Inventory", href: "modulos/inventory" }],
  },
  {
    label: "Tabelas",
    description: "Schema das tabelas do banco com campos, tipos e políticas RLS.",
    links: [{ label: "products", href: "tabelas/products" }],
  },
];

export const metadata = { title: "Documentação Técnica — ERP" };

export default async function DocsPage({ params }: Props) {
  const { companySlug } = await params;

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Documentação Técnica</h1>
        <p className="text-sm text-muted-foreground">
          Referência para desenvolvedores e analistas do sistema.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <div key={section.label} className="space-y-3 rounded-lg border p-5">
            <h2 className="font-semibold">{section.label}</h2>
            <p className="text-sm text-muted-foreground">{section.description}</p>
            <ul className="space-y-1">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={`/${companySlug}/docs/${link.href}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {link.label} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
