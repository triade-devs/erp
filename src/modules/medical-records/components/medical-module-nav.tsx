"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileCheck2, FilePlus2, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Can } from "@/modules/authz/client";

export function MedicalModuleNav({ companySlug }: { companySlug: string }) {
  const pathname = usePathname();
  const items = [
    {
      label: "Pacientes",
      href: `/${companySlug}/medical`,
      icon: UsersRound,
      permission: "medical:patient:read_assigned",
    },
    {
      label: "Novo paciente",
      href: `/${companySlug}/medical/new`,
      icon: FilePlus2,
      permission: "medical:patient:create",
    },
    {
      label: "Modelos de consentimento",
      href: `/${companySlug}/medical/consent-templates`,
      icon: FileCheck2,
      permission: "medical:consent:manage",
    },
  ];

  return (
    <nav className="flex flex-wrap gap-2 border-b">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === `/${companySlug}/medical`
            ? pathname === item.href
            : pathname.startsWith(item.href);

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
  );
}
