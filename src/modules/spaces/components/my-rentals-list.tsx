"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelRentalAction } from "../actions/cancel-rental";
import { formatRentalPeriod } from "../services/rental-service";
import { EditRequestDialog } from "./edit-request-dialog";
import type { RentalWithRelations } from "../types";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmada",
  rejected: "Recusada",
  cancelled: "Cancelada",
};

type Props = { rentals: RentalWithRelations[] };

export function MyRentalsList({ rentals }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const now = Date.now();

  function withdraw(rental: RentalWithRelations) {
    const formData = new FormData();
    formData.set("rentalId", rental.id);
    formData.set("spaceId", rental.space_id);
    startTransition(async () => {
      const result = await cancelRentalAction({ ok: false }, formData);
      if (result.ok) {
        toast.success("Solicitação retirada");
        router.refresh();
      } else {
        toast.error(result.message ?? "Erro ao retirar");
      }
    });
  }

  if (rentals.length === 0) {
    return <p className="text-sm text-muted-foreground">Você ainda não tem reservas.</p>;
  }

  return (
    <div className="space-y-2">
      {rentals.map((r) => {
        const expired = r.status === "pending" && new Date(r.ends_at).getTime() < now;
        const editable = r.status === "pending" && !expired;
        return (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{r.spaces?.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">
                {formatRentalPeriod(r.booking_kind, r.starts_at, r.ends_at)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>
                {expired ? "Expirada" : (STATUS_LABEL[r.status] ?? r.status)}
              </Badge>
              {editable && (
                <>
                  <EditRequestDialog rental={r} />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={isPending}
                    onClick={() => withdraw(r)}
                  >
                    Retirar
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
