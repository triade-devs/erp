"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { decideRentalAction } from "../actions/decide-rental";
import { formatRentalPeriod } from "../services/rental-service";
import type { PendingRequestBatch } from "../types";

type Props = { batch: PendingRequestBatch };

export function PendingRequestCard({ batch }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function decide(rentalId: string, decision: "approve" | "reject") {
    const formData = new FormData();
    formData.set("rentalId", rentalId);
    formData.set("decision", decision);
    startTransition(async () => {
      const result = await decideRentalAction({ ok: false }, formData);
      if (result.ok) {
        toast.success(result.message ?? "Decisão registrada");
        router.refresh();
      } else {
        toast.error(result.message ?? "Erro ao decidir");
      }
    });
  }

  const now = Date.now();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{batch.requester?.full_name ?? "—"}</span>
          <span className="text-sm text-muted-foreground">solicitou</span>
          <span className="font-medium">{batch.space?.name ?? "—"}</span>
          <Badge variant="secondary">{batch.items.length} horário(s)</Badge>
        </div>
        {batch.notes && <p className="text-sm text-muted-foreground">&quot;{batch.notes}&quot;</p>}
      </CardHeader>
      <CardContent className="space-y-2">
        {batch.items.map((item) => {
          const expired = new Date(item.ends_at).getTime() < now;
          return (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded border p-2"
            >
              <span className="text-sm">
                {formatRentalPeriod(item.booking_kind, item.starts_at, item.ends_at)}
                {expired && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    expirada
                  </Badge>
                )}
              </span>
              {!expired && (
                <div className="flex gap-1">
                  <Button size="sm" disabled={isPending} onClick={() => decide(item.id, "approve")}>
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    disabled={isPending}
                    onClick={() => decide(item.id, "reject")}
                  >
                    Recusar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
