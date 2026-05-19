import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPatientRecord,
  listAssignableMembers,
  PatientAssignments,
  PatientForm,
  PatientRecordNav,
  updatePatientAction,
} from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function PatientPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const [{ patient, timeline }, members] = await Promise.all([
    getPatientRecord(company.id, patientId),
    listAssignableMembers(company.id),
  ]);

  const updateAction = updatePatientAction.bind(null, patient.id);

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patient.id}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
      />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dados do paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientForm patient={patient} updateAction={updateAction} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientAssignments
              patientId={patient.id}
              members={members}
              assignments={timeline.assignments}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <TimelineCard title="Consultas">
          {timeline.consultations.map((item) => (
            <Link
              key={item.id}
              href={`/${companySlug}/medical/${patient.id}/consultations/${item.id}`}
              className="block border-b py-3 transition-colors last:border-0 hover:text-primary"
            >
              <p className="font-medium">
                {new Date(item.consultation_at).toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.chief_complaint ?? "Sem queixa registrada"}
              </p>
            </Link>
          ))}
        </TimelineCard>
        <TimelineCard title="Prescrições">
          {timeline.prescriptions.map((item) => (
            <Link
              key={item.id}
              href={`/${companySlug}/medical/${patient.id}/prescriptions/${item.id}`}
              className="block border-b py-3 transition-colors last:border-0 hover:text-primary"
            >
              <p className="font-medium">{new Date(item.issued_at).toLocaleDateString("pt-BR")}</p>
              <p className="text-sm text-muted-foreground">
                {(item.medical_prescription_items ?? []).length} item(ns)
              </p>
            </Link>
          ))}
        </TimelineCard>
        <TimelineCard title="Consentimentos">
          {timeline.consents.map((item) => (
            <Link
              key={item.id}
              href={`/${companySlug}/medical/${patient.id}/consents/${item.id}`}
              className="block border-b py-3 transition-colors last:border-0 hover:text-primary"
            >
              <p className="font-medium">
                {item.template_title} v{item.template_version}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(item.accepted_at).toLocaleString("pt-BR")}
              </p>
            </Link>
          ))}
        </TimelineCard>
      </div>
    </section>
  );
}

function TimelineCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children ? (
          <div>{children}</div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum registro.</p>
        )}
      </CardContent>
    </Card>
  );
}
