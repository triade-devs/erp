"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { switchActiveCompanyAction } from "../actions/switch-active-company";
import type { Company } from "../queries/list-my-companies";

interface CompanySwitcherProps {
  companies: Company[];
  activeCompanyId: string | null;
}

export function CompanySwitcher({ companies, activeCompanyId }: CompanySwitcherProps) {
  const [isPending, startTransition] = useTransition();

  if (companies.length <= 1) {
    const company = companies[0];
    if (!company) return null;
    return <span className="max-w-[200px] truncate text-sm font-medium">{company.name}</span>;
  }

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? companies[0];

  function handleChange(companyId: string) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("companyId", companyId);
      await switchActiveCompanyAction({ ok: true }, formData);
    });
  }

  return (
    <Select value={activeCompany?.id ?? ""} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-[200px]">
        <SelectValue placeholder="Selecionar empresa" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
