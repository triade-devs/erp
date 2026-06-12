import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { formatRentalPeriod } from "../services/rental-service";
import { CancelRentalButton } from "./cancel-rental-button";
import type { RentalWithRelations } from "../types";

type Props = {
  rentals: RentalWithRelations[];
  /** Exibe a coluna de espaço (útil na visão agregada). */
  showSpace?: boolean;
  /** Se o usuário atual pode cancelar aluguéis de terceiros. */
  canCancelAny?: boolean;
  /** Id do usuário atual — pode cancelar os próprios aluguéis. */
  currentUserId?: string;
};

export function RentalTable({ rentals, showSpace, canCancelAny, currentUserId }: Props) {
  if (rentals.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhum aluguel registrado.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showSpace && <TableHead>Espaço</TableHead>}
          <TableHead>Responsável</TableHead>
          <TableHead>Período</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Valor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rentals.map((r) => {
          const isConfirmed = r.status === "confirmed";
          const canCancel = isConfirmed && (canCancelAny || r.renter_user_id === currentUserId);
          return (
            <TableRow key={r.id} className={isConfirmed ? "" : "opacity-60"}>
              {showSpace && <TableCell>{r.spaces?.name ?? "—"}</TableCell>}
              <TableCell>{r.renter?.full_name ?? "—"}</TableCell>
              <TableCell>{formatRentalPeriod(r.booking_kind, r.starts_at, r.ends_at)}</TableCell>
              <TableCell>{r.booking_kind === "daily" ? "Diária" : "Por horário"}</TableCell>
              <TableCell className="text-right">
                {r.price > 0 ? formatCurrency(r.price) : <Badge variant="secondary">Grátis</Badge>}
              </TableCell>
              <TableCell>
                {isConfirmed ? (
                  <Badge>Confirmado</Badge>
                ) : (
                  <Badge variant="outline">Cancelado</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {canCancel && <CancelRentalButton rentalId={r.id} spaceId={r.space_id} />}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
