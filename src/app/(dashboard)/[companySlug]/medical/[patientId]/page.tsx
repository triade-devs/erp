import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPatientRecord,
  listAssignableMembers,
  PatientAssignments,
  PatientForm,
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
  const basePath = `/${companySlug}/medical/${patient.id}`;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{patient.full_name}</h1>
          <p className="text-sm text-muted-foreground">
            {patient.document ?? "Sem documento"} · {patient.phone ?? "Sem telefone"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/${companySlug}/medical`}>Voltar</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${basePath}/consents/new`}>Consentimento</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`${basePath}/prescriptions/new`}>Prescrição</Link>
          </Button>
          <Button asChild>
            <Link href={`${basePath}/consultations/new`}>Nova consulta</Link>
          </Button>
        </div>
      </header>

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
            <div key={item.id} className="border-b py-3 last:border-0">
              <p className="font-medium">
                {new Date(item.consultation_at).toLocaleString("pt-BR")}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.chief_complaint ?? "Sem queixa registrada"}
              </p>
            </div>
          ))}
        </TimelineCard>
        <TimelineCard title="Prescrições">
          {timeline.prescriptions.map((item) => (
            <div key={item.id} className="border-b py-3 last:border-0">
              <p className="font-medium">{new Date(item.issued_at).toLocaleDateString("pt-BR")}</p>
              <p className="text-sm text-muted-foreground">
                {(item.medical_prescription_items ?? []).length} item(ns)
              </p>
            </div>
          ))}
        </TimelineCard>
        <TimelineCard title="Consentimentos">
          {timeline.consents.map((item) => (
            <div key={item.id} className="border-b py-3 last:border-0">
              <p className="font-medium">
                {item.template_title} v{item.template_version}
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(item.accepted_at).toLocaleString("pt-BR")}
              </p>
            </div>
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
