"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requestRentalAction } from "../actions/request-rental";

type SpaceOption = { id: string; name: string; bookingMode: "daily" | "hourly" | "both" };
type Slot = { startsAt: string; endsAt: string };

type Props = { spaces: SpaceOption[] };

export function RequestRentalDialog({ spaces }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [spaceId, setSpaceId] = useState("");
  const [bookingKind, setBookingKind] = useState<"daily" | "hourly">("hourly");
  const [slots, setSlots] = useState<Slot[]>([{ startsAt: "", endsAt: "" }]);
  const [notes, setNotes] = useState("");

  const selectedSpace = spaces.find((s) => s.id === spaceId);
  const allowedKinds: Array<"daily" | "hourly"> =
    selectedSpace?.bookingMode === "both"
      ? ["hourly", "daily"]
      : selectedSpace?.bookingMode === "daily"
        ? ["daily"]
        : ["hourly"];

  function updateSlot(i: number, field: keyof Slot, value: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  }

  function submit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("spaceId", spaceId);
      formData.set("bookingKind", bookingKind);
      formData.set("slots", JSON.stringify(slots));
      if (notes) formData.set("notes", notes);

      const result = await requestRentalAction({ ok: false }, formData);
      if (result.ok) {
        toast.success(result.message ?? "Solicitação enviada");
        setOpen(false);
        setSpaceId("");
        setBookingKind("hourly");
        setSlots([{ startsAt: "", endsAt: "" }]);
        setNotes("");
        router.refresh();
      } else {
        toast.error(result.message ?? "Erro ao enviar solicitação");
      }
    });
  }

  const inputType = bookingKind === "hourly" ? "datetime-local" : "date";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Solicitar reserva</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Solicitar reserva</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Espaço</Label>
            <Select value={spaceId} onValueChange={setSpaceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um espaço" />
              </SelectTrigger>
              <SelectContent>
                {spaces.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo de reserva</Label>
            <Select
              value={bookingKind}
              onValueChange={(v) => setBookingKind(v as "daily" | "hourly")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedKinds.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k === "hourly" ? "Por hora" : "Dia todo"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Datas / horários</Label>
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type={inputType}
                  value={slot.startsAt}
                  onChange={(e) => updateSlot(i, "startsAt", e.target.value)}
                  aria-label={`Início do slot ${i + 1}`}
                />
                <span className="text-muted-foreground">→</span>
                <Input
                  type={inputType}
                  value={slot.endsAt}
                  onChange={(e) => updateSlot(i, "endsAt", e.target.value)}
                  aria-label={`Fim do slot ${i + 1}`}
                />
                {slots.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSlots((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSlots((prev) => [...prev, { startsAt: "", endsAt: "" }])}
            >
              + Adicionar data/horário
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label>Observações (opcional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </div>

          <Button onClick={submit} disabled={isPending || !spaceId} className="w-full">
            {isPending ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
