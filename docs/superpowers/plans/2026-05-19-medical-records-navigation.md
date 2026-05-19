# Medical Records Navigation Improvement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a navegação do módulo de Prontuário Médico: remover ação das abas, adicionar páginas de listagem por seção, e inserir breadcrumb com contadores nas abas.

**Architecture:** `PatientRecordNav` recebe dois novos props (`counts`, `detailLabel`) e passa a usar o `Breadcrumb` do shadcn/ui. As abas apontam para listagens (não mais para `/new`). Três novas páginas de listagem reutilizam `getPatientRecord` já existente.

**Tech Stack:** Next.js 15 App Router, shadcn/ui (`Breadcrumb`), TypeScript strict, `usePathname` (já em uso), `Can` de `@/modules/authz/client`.

---

## Task 1: Instalar o componente Breadcrumb do shadcn/ui

**Files:**

- Create: `src/components/ui/breadcrumb.tsx` (gerado pelo CLI)

- [ ] **Step 1: Instalar o componente**

```bash
cd /Users/yvillanova/Documents/Claude/Projects/ERP
npx shadcn@latest add breadcrumb --yes
```

- [ ] **Step 2: Verificar que foi criado**

```bash
ls src/components/ui/breadcrumb.tsx
```

Expected: arquivo existe sem erro.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/breadcrumb.tsx
git commit -m "chore: add shadcn breadcrumb component"
```

---

## Task 2: Atualizar `PatientRecordNav` — novos props, breadcrumb, hrefs corretos

**Files:**

- Modify: `src/modules/medical-records/components/patient-record-nav.tsx`

- [ ] **Step 1: Verificar que o typecheck passa antes de qualquer mudança**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: `Found 0 errors.`

- [ ] **Step 2: Substituir o conteúdo completo do arquivo**

Substitua todo o conteúdo de `src/modules/medical-records/components/patient-record-nav.tsx` por:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardPlus, FileCheck2, FileText, UserRound } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { Can } from "@/modules/authz/client";

type Counts = { consultations: number; prescriptions: number; consents: number };

type Props = {
  companySlug: string;
  patientId: string;
  patientName: string;
  document?: string | null;
  phone?: string | null;
  counts: Counts;
  detailLabel?: string;
};

export function PatientRecordNav({
  companySlug,
  patientId,
  patientName,
  document,
  phone,
  counts,
  detailLabel,
}: Props) {
  const pathname = usePathname();
  const basePath = `/${companySlug}/medical/${patientId}`;

  const inConsultations = pathname.startsWith(`${basePath}/consultations`);
  const inPrescriptions = pathname.startsWith(`${basePath}/prescriptions`);
  const inConsents = pathname.startsWith(`${basePath}/consents`);

  const items = [
    {
      label: "Resumo",
      href: basePath,
      icon: UserRound,
      permission: "medical:patient:read_assigned",
      isActive: pathname === basePath,
      count: undefined as number | undefined,
    },
    {
      label: "Consultas",
      href: `${basePath}/consultations`,
      icon: ClipboardPlus,
      permission: "medical:consultation:write",
      isActive: inConsultations,
      count: counts.consultations,
    },
    {
      label: "Prescrições",
      href: `${basePath}/prescriptions`,
      icon: FileText,
      permission: "medical:prescription:write",
      isActive: inPrescriptions,
      count: counts.prescriptions,
    },
    {
      label: "Consentimentos",
      href: `${basePath}/consents`,
      icon: FileCheck2,
      permission: "medical:consent:accept",
      isActive: inConsents,
      count: counts.consents,
    },
  ];

  let sectionLabel: string | undefined;
  let sectionHref: string | undefined;
  if (inConsultations) {
    sectionLabel = "Consultas";
    sectionHref = `${basePath}/consultations`;
  } else if (inPrescriptions) {
    sectionLabel = "Prescrições";
    sectionHref = `${basePath}/prescriptions`;
  } else if (inConsents) {
    sectionLabel = "Consentimentos";
    sectionHref = `${basePath}/consents`;
  }

  const isLastBreadcrumb = !sectionLabel || !detailLabel;

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/${companySlug}/medical`}>Pacientes</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {isLastBreadcrumb && !sectionLabel ? (
              <BreadcrumbPage>{patientName}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={basePath}>{patientName}</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {sectionLabel && sectionHref && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {detailLabel ? (
                  <BreadcrumbLink asChild>
                    <Link href={sectionHref}>{sectionLabel}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{sectionLabel}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          )}
          {detailLabel && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{detailLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{patientName}</h2>
          <p className="text-sm text-muted-foreground">
            {document ?? "Sem documento"} · {phone ?? "Sem telefone"}
          </p>
        </div>
      </div>

      <nav className="flex flex-wrap gap-2 border-b">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Can key={item.href} permission={item.permission}>
              <Link
                href={item.href}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium",
                  item.isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.count !== undefined && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal tabular-nums">
                    {item.count}
                  </span>
                )}
              </Link>
            </Can>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Rodar typecheck — espera erros porque os callers ainda não passam `counts`**

```bash
npm run typecheck 2>&1 | grep "patient-record-nav\|PatientRecordNav" | head -20
```

Expected: erros de "Property 'counts' is missing" nos arquivos de página.

- [ ] **Step 4: Commit parcial (componente novo, callers ainda com erro)**

```bash
git add src/modules/medical-records/components/patient-record-nav.tsx
git commit -m "feat: update PatientRecordNav with counts, breadcrumb, and correct tab hrefs"
```

---

## Task 3: Remover "Novo paciente" das abas do módulo

**Files:**

- Modify: `src/modules/medical-records/components/medical-module-nav.tsx`

- [ ] **Step 1: Remover o item "Novo paciente" do array `items`**

Em `src/modules/medical-records/components/medical-module-nav.tsx`, localize o array `items` e remova o objeto com `label: "Novo paciente"`. O array resultante deve ter apenas dois itens:

```tsx
const items = [
  {
    label: "Pacientes",
    href: `/${companySlug}/medical`,
    icon: UsersRound,
    permission: "medical:patient:read_assigned",
  },
  {
    label: "Modelos de consentimento",
    href: `/${companySlug}/medical/consent-templates`,
    icon: FileCheck2,
    permission: "medical:consent:manage",
  },
];
```

Remova também o import de `FilePlus2` do `lucide-react` pois não será mais usado.

- [ ] **Step 2: Verificar que não há erros de tipo neste arquivo**

```bash
npm run typecheck 2>&1 | grep "medical-module-nav" | head -10
```

Expected: nenhuma linha de erro para esse arquivo.

- [ ] **Step 3: Commit**

```bash
git add src/modules/medical-records/components/medical-module-nav.tsx
git commit -m "feat: remove 'Novo paciente' from module nav tabs"
```

---

## Task 4: Atualizar `/[patientId]/page.tsx` para passar `counts`

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/medical/[patientId]/page.tsx`

- [ ] **Step 1: Adicionar `counts` na chamada do `PatientRecordNav`**

No arquivo `src/app/(dashboard)/[companySlug]/medical/[patientId]/page.tsx`, localize onde `PatientRecordNav` é renderizado e adicione a prop `counts`:

```tsx
<PatientRecordNav
  companySlug={companySlug}
  patientId={patient.id}
  patientName={patient.full_name}
  document={patient.document}
  phone={patient.phone}
  counts={{
    consultations: timeline.consultations.length,
    prescriptions: timeline.prescriptions.length,
    consents: timeline.consents.length,
  }}
/>
```

Nota: `timeline` já está disponível nessa página — ela já faz `const [{ patient, timeline }, members] = await Promise.all([...])`.

- [ ] **Step 2: Verificar que esse arquivo não tem mais erros**

```bash
npm run typecheck 2>&1 | grep "\[patientId\]/page" | head -10
```

Expected: nenhum erro para esse arquivo específico.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/[companySlug]/medical/[patientId]/page.tsx"
git commit -m "feat: pass counts to PatientRecordNav on patient summary page"
```

---

## Task 5: Atualizar páginas de criação (`/new`) com `counts` e `detailLabel`

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/new/page.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/new/page.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/new/page.tsx`

- [ ] **Step 1: Atualizar `consultations/new/page.tsx`**

Substitua o conteúdo completo de `src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/new/page.tsx`:

```tsx
import { ConsultationForm, getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function NewConsultationPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const { patient, timeline } = await getPatientRecord(company.id, patientId);

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={{
          consultations: timeline.consultations.length,
          prescriptions: timeline.prescriptions.length,
          consents: timeline.consents.length,
        }}
        detailLabel="Nova consulta"
      />
      <div>
        <h2 className="text-xl font-semibold">Nova consulta</h2>
        <p className="text-sm text-muted-foreground">Registro clínico e anamnese da consulta</p>
      </div>
      <div className="rounded-lg border p-6">
        <ConsultationForm patientId={patientId} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Atualizar `prescriptions/new/page.tsx`**

Substitua o conteúdo completo de `src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/new/page.tsx`:

```tsx
import { getPatientRecord, PatientRecordNav, PrescriptionForm } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function NewPrescriptionPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const { patient, timeline } = await getPatientRecord(company.id, patientId);

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={{
          consultations: timeline.consultations.length,
          prescriptions: timeline.prescriptions.length,
          consents: timeline.consents.length,
        }}
        detailLabel="Nova prescrição"
      />
      <div>
        <h2 className="text-xl font-semibold">Nova prescrição</h2>
        <p className="text-sm text-muted-foreground">
          Medicamentos, dose, frequência e orientações
        </p>
      </div>
      <div className="rounded-lg border p-6">
        <PrescriptionForm patientId={patientId} />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Atualizar `consents/new/page.tsx`**

Substitua o conteúdo completo de `src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/new/page.tsx`:

```tsx
import {
  ConsentAcceptForm,
  ConsentTemplateForm,
  getPatientRecord,
  listConsentTemplates,
  PatientRecordNav,
} from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function NewConsentPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const [{ patient, timeline }, templates] = await Promise.all([
    getPatientRecord(company.id, patientId),
    listConsentTemplates(company.id),
  ]);

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={{
          consultations: timeline.consultations.length,
          prescriptions: timeline.prescriptions.length,
          consents: timeline.consents.length,
        }}
        detailLabel="Novo consentimento"
      />
      <div>
        <h2 className="text-xl font-semibold">Consentimentos</h2>
        <p className="text-sm text-muted-foreground">Modelos versionados e aceite do paciente</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Registrar aceite</h2>
          <ConsentAcceptForm patientId={patientId} templates={templates} />
        </div>
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Novo modelo</h2>
          <ConsentTemplateForm />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add \
  "src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/new/page.tsx" \
  "src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/new/page.tsx" \
  "src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/new/page.tsx"
git commit -m "feat: pass counts and detailLabel to PatientRecordNav on /new pages"
```

---

## Task 6: Atualizar páginas de detalhe com `counts` e `detailLabel`

**Files:**

- Modify: `src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/[consultationId]/page.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/[prescriptionId]/page.tsx`
- Modify: `src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/[consentId]/page.tsx`

- [ ] **Step 1: Atualizar `consultations/[consultationId]/page.tsx`**

Substitua o conteúdo completo de `src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/[consultationId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import {
  ConsultationForm,
  getConsultation,
  getPatientRecord,
  PatientRecordNav,
  updateConsultationAction,
} from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string; consultationId: string }>;
};

export default async function ConsultationDetailPage({ params }: Props) {
  const { companySlug, patientId, consultationId } = await params;
  const company = await resolveCompany(companySlug);

  const [{ patient, timeline }, consultation] = await Promise.all([
    getPatientRecord(company.id, patientId),
    getConsultation(company.id, consultationId),
  ]);

  if (consultation.patient_id !== patientId) notFound();

  const action = updateConsultationAction.bind(null, consultationId);
  const detailLabel = new Date(consultation.consultation_at).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={{
          consultations: timeline.consultations.length,
          prescriptions: timeline.prescriptions.length,
          consents: timeline.consents.length,
        }}
        detailLabel={detailLabel}
      />
      <div>
        <h2 className="text-xl font-semibold">Editar consulta</h2>
        <p className="text-sm text-muted-foreground">Atualize o registro clínico da consulta</p>
      </div>
      <div className="rounded-lg border p-6">
        <ConsultationForm patientId={patientId} consultation={consultation} action={action} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Atualizar `prescriptions/[prescriptionId]/page.tsx`**

Substitua o conteúdo completo de `src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/[prescriptionId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import {
  getPatientRecord,
  getPrescription,
  PatientRecordNav,
  PrescriptionForm,
  updatePrescriptionAction,
} from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string; prescriptionId: string }>;
};

export default async function PrescriptionDetailPage({ params }: Props) {
  const { companySlug, patientId, prescriptionId } = await params;
  const company = await resolveCompany(companySlug);

  const [{ patient, timeline }, prescription] = await Promise.all([
    getPatientRecord(company.id, patientId),
    getPrescription(company.id, prescriptionId),
  ]);

  if (prescription.patient_id !== patientId) notFound();

  const action = updatePrescriptionAction.bind(null, prescriptionId);
  const detailLabel = new Date(prescription.issued_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={{
          consultations: timeline.consultations.length,
          prescriptions: timeline.prescriptions.length,
          consents: timeline.consents.length,
        }}
        detailLabel={detailLabel}
      />
      <div>
        <h2 className="text-xl font-semibold">Editar prescrição</h2>
        <p className="text-sm text-muted-foreground">
          Atualize medicamentos, dose, frequência e orientações
        </p>
      </div>
      <div className="rounded-lg border p-6">
        <PrescriptionForm patientId={patientId} prescription={prescription} action={action} />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Atualizar `consents/[consentId]/page.tsx`**

Substitua o conteúdo completo de `src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/[consentId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getConsent, getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string; consentId: string }>;
};

export default async function ConsentDetailPage({ params }: Props) {
  const { companySlug, patientId, consentId } = await params;
  const company = await resolveCompany(companySlug);

  const [{ patient, timeline }, consent] = await Promise.all([
    getPatientRecord(company.id, patientId),
    getConsent(company.id, consentId),
  ]);

  if (consent.patient_id !== patientId) notFound();

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={{
          consultations: timeline.consultations.length,
          prescriptions: timeline.prescriptions.length,
          consents: timeline.consents.length,
        }}
        detailLabel={`${consent.template_title} v${consent.template_version}`}
      />
      <div>
        <h2 className="text-xl font-semibold">Consentimento registrado</h2>
        <p className="text-sm text-muted-foreground">Registro imutável do aceite do paciente</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {consent.template_title} v{consent.template_version}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Aceito em {new Date(consent.accepted_at).toLocaleString("pt-BR")}
          </p>
          {consent.notes ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Observações</p>
              <p className="text-sm text-muted-foreground">{consent.notes}</p>
            </div>
          ) : null}
          <div className="space-y-1">
            <p className="text-sm font-medium">Conteúdo aceito</p>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/20 p-4 text-sm">
              {consent.accepted_body}
            </pre>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
```

- [ ] **Step 4: Verificar que todos os erros de `counts` sumiram**

```bash
npm run typecheck 2>&1 | grep "counts\|PatientRecordNav" | head -20
```

Expected: sem erros relacionados a `counts` ou `PatientRecordNav`.

- [ ] **Step 5: Commit**

```bash
git add \
  "src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/[consultationId]/page.tsx" \
  "src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/[prescriptionId]/page.tsx" \
  "src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/[consentId]/page.tsx"
git commit -m "feat: pass counts and detailLabel to PatientRecordNav on detail pages"
```

---

## Task 7: Criar páginas de listagem por seção

**Files:**

- Create: `src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/page.tsx`
- Create: `src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/page.tsx`
- Create: `src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/page.tsx`

- [ ] **Step 1: Criar `consultations/page.tsx`**

Crie `src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Can } from "@/modules/authz";
import { getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function ConsultationsListPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const { patient, timeline } = await getPatientRecord(company.id, patientId);
  const basePath = `/${companySlug}/medical/${patientId}`;

  const counts = {
    consultations: timeline.consultations.length,
    prescriptions: timeline.prescriptions.length,
    consents: timeline.consents.length,
  };

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={counts}
      />

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Consultas</h2>
          <p className="text-sm text-muted-foreground">
            {counts.consultations} consulta{counts.consultations !== 1 ? "s" : ""} registrada
            {counts.consultations !== 1 ? "s" : ""}
          </p>
        </div>
        <Can permission="medical:consultation:write">
          <Button asChild>
            <Link href={`${basePath}/consultations/new`}>Nova consulta</Link>
          </Button>
        </Can>
      </header>

      {timeline.consultations.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Nenhuma consulta registrada.
        </div>
      ) : (
        <div className="rounded-lg border">
          {timeline.consultations.map((item) => (
            <Link
              key={item.id}
              href={`${basePath}/consultations/${item.id}`}
              className="flex items-start justify-between border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">
                  {new Date(item.consultation_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.chief_complaint ?? "Sem queixa registrada"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Criar `prescriptions/page.tsx`**

Crie `src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Can } from "@/modules/authz";
import { getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function PrescriptionsListPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const { patient, timeline } = await getPatientRecord(company.id, patientId);
  const basePath = `/${companySlug}/medical/${patientId}`;

  const counts = {
    consultations: timeline.consultations.length,
    prescriptions: timeline.prescriptions.length,
    consents: timeline.consents.length,
  };

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={counts}
      />

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Prescrições</h2>
          <p className="text-sm text-muted-foreground">
            {counts.prescriptions} prescrição{counts.prescriptions !== 1 ? "ões" : ""} registrada
            {counts.prescriptions !== 1 ? "s" : ""}
          </p>
        </div>
        <Can permission="medical:prescription:write">
          <Button asChild>
            <Link href={`${basePath}/prescriptions/new`}>Nova prescrição</Link>
          </Button>
        </Can>
      </header>

      {timeline.prescriptions.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Nenhuma prescrição registrada.
        </div>
      ) : (
        <div className="rounded-lg border">
          {timeline.prescriptions.map((item) => (
            <Link
              key={item.id}
              href={`${basePath}/prescriptions/${item.id}`}
              className="flex items-start justify-between border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">
                  {new Date(item.issued_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(item.medical_prescription_items ?? []).length} item
                  {(item.medical_prescription_items ?? []).length !== 1 ? "ns" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Criar `consents/page.tsx`**

Crie `src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Can } from "@/modules/authz";
import { getPatientRecord, PatientRecordNav } from "@/modules/medical-records";
import { resolveCompany } from "@/modules/tenancy";

type Props = {
  params: Promise<{ companySlug: string; patientId: string }>;
};

export default async function ConsentsListPage({ params }: Props) {
  const { companySlug, patientId } = await params;
  const company = await resolveCompany(companySlug);
  const { patient, timeline } = await getPatientRecord(company.id, patientId);
  const basePath = `/${companySlug}/medical/${patientId}`;

  const counts = {
    consultations: timeline.consultations.length,
    prescriptions: timeline.prescriptions.length,
    consents: timeline.consents.length,
  };

  return (
    <section className="space-y-6">
      <PatientRecordNav
        companySlug={companySlug}
        patientId={patientId}
        patientName={patient.full_name}
        document={patient.document}
        phone={patient.phone}
        counts={counts}
      />

      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Consentimentos</h2>
          <p className="text-sm text-muted-foreground">
            {counts.consents} consentimento{counts.consents !== 1 ? "s" : ""} registrado
            {counts.consents !== 1 ? "s" : ""}
          </p>
        </div>
        <Can permission="medical:consent:accept">
          <Button asChild>
            <Link href={`${basePath}/consents/new`}>Novo consentimento</Link>
          </Button>
        </Can>
      </header>

      {timeline.consents.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          Nenhum consentimento registrado.
        </div>
      ) : (
        <div className="rounded-lg border">
          {timeline.consents.map((item) => (
            <Link
              key={item.id}
              href={`${basePath}/consents/${item.id}`}
              className="flex items-start justify-between border-b px-4 py-3 transition-colors last:border-0 hover:bg-muted/50"
            >
              <div>
                <p className="font-medium">
                  {item.template_title} v{item.template_version}
                </p>
                <p className="text-sm text-muted-foreground">
                  Aceito em {new Date(item.accepted_at).toLocaleString("pt-BR")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add \
  "src/app/(dashboard)/[companySlug]/medical/[patientId]/consultations/page.tsx" \
  "src/app/(dashboard)/[companySlug]/medical/[patientId]/prescriptions/page.tsx" \
  "src/app/(dashboard)/[companySlug]/medical/[patientId]/consents/page.tsx"
git commit -m "feat: add listing pages for consultations, prescriptions, and consents"
```

---

## Task 8: Verificação final

- [ ] **Step 1: Typecheck limpo**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: `Found 0 errors.`

- [ ] **Step 2: Lint limpo**

```bash
npm run lint 2>&1 | tail -10
```

Expected: sem erros.

- [ ] **Step 3: Build de produção**

```bash
npm run build 2>&1 | tail -15
```

Expected: `✓ Compiled successfully` sem erros de tipo.

- [ ] **Step 4: Commit final se necessário**

Se lint ou prettier tiver reformatado algum arquivo:

```bash
git add -A
git commit -m "chore: apply lint/format fixes after navigation refactor"
```
