import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function CompanyAdminLayout({ children, params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, slug, is_active, plan")
    .eq("id", id)
    .maybeSingle();

  if (error || !company) notFound();

  const tabs = [
    { label: "Visão geral", href: `/admin/companies/${id}` },
    { label: "Módulos", href: `/admin/companies/${id}/modules` },
    { label: "Membros", href: `/admin/companies/${id}/members` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/companies">← Empresas</Link>
        </Button>
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="font-mono text-sm text-muted-foreground">{company.slug}</p>
          </div>
          <Badge variant={company.is_active ? "default" : "secondary"}>
            {company.is_active ? "Ativa" : "Inativa"}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {company.plan}
          </Badge>
        </div>
      </div>

      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
