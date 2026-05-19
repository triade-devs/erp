"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ClipboardPlus, FileCheck2, FileText, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Can } from "@/modules/authz/client";

type Props = {
  companySlug: string;
  patientId: string;
  patientName: string;
  document?: string | null;
  phone?: string | null;
};

export function PatientRecordNav({ companySlug, patientId, patientName, document, phone }: Props) {
  const pathname = usePathname();
  const basePath = `/${companySlug}/medical/${patientId}`;
  const items = [
    {
      label: "Resumo",
      href: basePath,
      icon: UserRound,
      permission: "medical:patient:read_assigned",
    },
    {
      label: "Consulta",
      href: `${basePath}/consultations/new`,
      icon: ClipboardPlus,
      permission: "medical:consultation:write",
    },
    {
      label: "Prescrição",
      href: `${basePath}/prescriptions/new`,
      icon: FileText,
      permission: "medical:prescription:write",
    },
    {
      label: "Consentimentos",
      href: `${basePath}/consents/new`,
      icon: FileCheck2,
      permission: "medical:consent:accept",
    },
  ];

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-3 w-fit gap-2">
        <Link href={`/${companySlug}/medical`}>
          <ArrowLeft className="h-4 w-4" />
          Pacientes
        </Link>
      </Button>

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
          const isActive = pathname === item.href;

          return (
            <Can key={item.href} permission={item.permission}>
              <Link
                href={item.href}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Can>
          );
        })}
      </nav>
    </div>
  );
}
