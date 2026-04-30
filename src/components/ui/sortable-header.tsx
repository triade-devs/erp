import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { TableHead } from "@/components/ui/table";

type SortDir = "asc" | "desc";

type Props = {
  column: string;
  label: string;
  currentSort: string;
  currentDir: SortDir;
  buildHref: (col: string, dir: SortDir) => string;
  /** Direção padrão ao ativar a coluna pela primeira vez. Default: "asc" */
  defaultDir?: SortDir;
  /** Alinhamento do conteúdo do header. Default: "left" */
  align?: "left" | "right";
};

export function SortableHeader({
  column,
  label,
  currentSort,
  currentDir,
  buildHref,
  defaultDir = "asc",
  align = "left",
}: Props) {
  const isActive = column === currentSort;
  const nextDir: SortDir = isActive ? (currentDir === "asc" ? "desc" : "asc") : defaultDir;

  const Icon = isActive ? (currentDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead
      className="p-0"
      aria-sort={isActive ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={buildHref(column, nextDir)}
        className={cn(
          "flex h-full w-full items-center gap-1 px-4 py-3 hover:text-foreground",
          align === "right" && "justify-end",
        )}
      >
        {label}
        <Icon
          aria-hidden="true"
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isActive ? "text-foreground" : "text-muted-foreground/50",
          )}
        />
      </Link>
    </TableHead>
  );
}
