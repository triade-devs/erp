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
