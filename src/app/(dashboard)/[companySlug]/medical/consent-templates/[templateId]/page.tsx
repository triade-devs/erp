import {
  ConsentTemplateForm,
  getConsentTemplate,
  updateConsentTemplateAction,
} from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; templateId: string }>;
};

export default async function ConsentTemplateDetailPage({ params }: Props) {
  const { companySlug, templateId } = await params;
  const company = await resolveCompany(companySlug);
  const template = await getConsentTemplate(company.id, templateId);
  const action = updateConsentTemplateAction.bind(null, templateId);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Editar modelo de consentimento</h2>
        <p className="text-sm text-muted-foreground">
          {template.title} v{template.version}
        </p>
      </div>
      <div className="max-w-3xl rounded-lg border p-6">
        <ConsentTemplateForm template={template} action={action} />
      </div>
      <p className="text-xs text-muted-foreground">
        O aceite já registrado para pacientes permanece imutável.
      </p>
    </section>
  );
}
