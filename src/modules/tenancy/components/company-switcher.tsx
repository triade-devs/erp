"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  if (companies.length <= 1) {
    const company = companies[0];
    if (!company) return null;
    return <span className="max-w-[200px] truncate text-sm font-medium">{company.name}</span>;
  }

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? companies[0];

  function handleChange(companyId: string) {
    const targetCompany = companies.find((c) => c.id === companyId);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("companyId", companyId);
      const result = await switchActiveCompanyAction({ ok: true }, formData);
      if (!result.ok) {
        setError(result.message ?? "Erro ao trocar empresa");
      } else if (result.ok) {
        setError(null);
        if (targetCompany?.slug) {
          // Substitui o slug atual pelo slug da empresa selecionada,
          // mantendo o restante da rota (ex: /default/inventory → /empresa-teste/inventory)
          const currentSlug = activeCompany?.slug ?? "";
          const newPath = currentSlug
            ? pathname.replace(new RegExp(`^/${currentSlug}(/|$)`), `/${targetCompany.slug}$1`)
            : `/${targetCompany.slug}`;
          router.push(newPath);
        }
      }
    });
  }

  return (
    <div>
      <Select value={activeCompany?.id ?? ""} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger aria-label="Empresa ativa" className="h-8 w-[200px]">
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
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
