"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateRequestAction } from "../actions/update-request";
import type { RentalWithRelations } from "../types";

type Props = { rental: RentalWithRelations };

export function EditRequestDialog({ rental }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isDaily = rental.booking_kind === "daily";
  const inputType = isDaily ? "date" : "datetime-local";
  const fmt = isDaily ? "yyyy-MM-dd" : "yyyy-MM-dd'T'HH:mm";
  const [startsAt, setStartsAt] = useState(format(new Date(rental.starts_at), fmt));
  const [endsAt, setEndsAt] = useState(format(new Date(rental.ends_at), fmt));
  const [notes, setNotes] = useState(rental.notes ?? "");

  function submit() {
    const formData = new FormData();
    formData.set("rentalId", rental.id);
    formData.set("startsAt", startsAt);
    formData.set("endsAt", endsAt);
    formData.set("notes", notes);
    startTransition(async () => {
      const result = await updateRequestAction({ ok: false }, formData);
      if (result.ok) {
        toast.success(result.message ?? "Solicitação atualizada");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message ?? "Erro ao atualizar");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar solicitação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Início</Label>
            <Input
              type={inputType}
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Fim</Label>
            <Input type={inputType} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>
          <Button onClick={submit} disabled={isPending} className="w-full">
            {isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
