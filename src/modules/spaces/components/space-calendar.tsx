import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRentalPeriod } from "../services/rental-service";
import type { RentalWithRelations } from "../types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  /** Primeiro dia do mês exibido. */
  month: Date;
  rentals: RentalWithRelations[];
  /** Base para os links de navegação (?month=YYYY-MM). */
  basePath: string;
  /** Mostra o nome do espaço em cada reserva (visão agregada). */
  showSpace?: boolean;
};

function monthParam(d: Date): string {
  return format(d, "yyyy-MM");
}

/** Reservas que ocupam um dado dia (sobreposição com [dia, dia+1)). */
function rentalsOnDay(rentals: RentalWithRelations[], day: Date): RentalWithRelations[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  return rentals.filter((r) => {
    const s = new Date(r.starts_at).getTime();
    const e = new Date(r.ends_at).getTime();
    return s < dayEnd && dayStart < e;
  });
}

export function SpaceCalendar({ month, rentals, basePath, showSpace }: Props) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const prev = monthParam(addMonths(month, -1));
  const next = monthParam(addMonths(month, 1));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium capitalize">
          {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
        </h3>
        <div className="flex gap-1">
          <Button asChild variant="outline" size="icon">
            <Link href={`${basePath}?month=${prev}`} aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon">
            <Link href={`${basePath}?month=${next}`} aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border bg-border text-sm">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="bg-muted px-2 py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {days.map((day) => {
          const dayRentals = rentalsOnDay(rentals, day);
          const inMonth = isSameMonth(day, month);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "min-h-[88px] bg-background p-1.5 align-top",
                !inMonth && "bg-muted/40 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  isToday(day) && "bg-primary font-semibold text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </div>
              <ul className="space-y-0.5">
                {dayRentals.slice(0, 3).map((r) => (
                  <li
                    key={r.id}
                    title={`${showSpace && r.spaces ? r.spaces.name + " · " : ""}${r.renter?.full_name ?? ""} · ${formatRentalPeriod(r.booking_kind, r.starts_at, r.ends_at)}${r.status === "pending" ? " · pendente" : ""}`}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[11px]",
                      r.status === "pending"
                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "bg-primary/10 text-primary",
                    )}
                  >
                    {showSpace && r.spaces ? `${r.spaces.name}: ` : ""}
                    {r.booking_kind === "hourly"
                      ? format(new Date(r.starts_at), "HH:mm")
                      : "Dia todo"}{" "}
                    {r.renter?.full_name ?? ""}
                  </li>
                ))}
                {dayRentals.length > 3 && (
                  <li className="px-1 text-[11px] text-muted-foreground">
                    +{dayRentals.length - 3} mais
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
