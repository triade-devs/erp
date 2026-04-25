import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function PaginationNav({ page, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={buildHref(page - 1)}>← Anterior</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          ← Anterior
        </Button>
      )}

      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>

      {page < totalPages ? (
        <Button asChild variant="outline" size="sm">
          <Link href={buildHref(page + 1)}>Próxima →</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Próxima →
        </Button>
      )}
    </div>
  );
}
