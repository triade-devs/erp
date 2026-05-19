import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listConsentTemplates } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function ConsentTemplatesPage({ params }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);
  const templates = await listConsentTemplates(company.id, { includeInactive: true });

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Modelos de consentimento</h2>
        <p className="text-sm text-muted-foreground">
          {templates.length} modelo(s) cadastrados para esta empresa
        </p>
      </header>

      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4 text-base">
                <span>
                  {template.title} v{template.version}
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${companySlug}/medical/consent-templates/${template.id}`}>
                    Editar
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3 text-sm text-muted-foreground">{template.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
