import { Badge } from "@/components/ui/badge";
import type { Company } from "../queries/list-my-companies";

interface CompanyBadgeProps {
  company: Company;
}

export function CompanyBadge({ company }: CompanyBadgeProps) {
  return (
    <Badge variant="secondary" className="max-w-[200px] truncate">
      {company.name}
    </Badge>
  );
}
