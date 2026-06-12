"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createRentalAction } from "../actions/create-rental";
import type { BookingMode } from "../types";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type MemberOption = { id: string; full_name: string };

type Props = {
  spaceId: string;
  bookingMode: BookingMode;
  defaultPrice: number;
  members: MemberOption[];
  onSuccess?: () => void;
};

export function RentalForm({ spaceId, bookingMode, defaultPrice, members, onSuccess }: Props) {
  const [state, formAction] = useActionState(createRentalAction, initial);
  const [kind, setKind] = useState<"daily" | "hourly">(
    bookingMode === "hourly" ? "hourly" : "daily",
  );
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (state.ok) {
      formRef.current?.reset();
      toast.success(state.message ?? "Aluguel registrado");
      onSuccess?.();
      return;
    }
    if (state.message) toast.error(state.message);
  }, [state, onSuccess]);

  const inputType = kind === "daily" ? "date" : "datetime-local";

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <input type="hidden" name="spaceId" value={spaceId} />

      {/* Responsável */}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="renterUserId">
          Responsável pelo aluguel <span className="text-red-500">*</span>
        </Label>
        <Select name="renterUserId">
          <SelectTrigger id="renterUserId">
            <SelectValue placeholder="Selecione um membro..." />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors?.renterUserId && (
          <p className="text-sm text-red-600">{fieldErrors.renterUserId[0]}</p>
        )}
      </div>

      {/* Tipo de reserva */}
      <div className="space-y-2">
        <Label htmlFor="bookingKind">
          Tipo de reserva <span className="text-red-500">*</span>
        </Label>
        <input type="hidden" name="bookingKind" value={kind} />
        <Select
          value={kind}
          onValueChange={(v) => setKind(v as "daily" | "hourly")}
          disabled={bookingMode !== "both"}
        >
          <SelectTrigger id="bookingKind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {bookingMode !== "hourly" && <SelectItem value="daily">Por dia</SelectItem>}
            {bookingMode !== "daily" && <SelectItem value="hourly">Por horário</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Valor */}
      <div className="space-y-2">
        <Label htmlFor="price">Valor (R$)</Label>
        <Input
          id="price"
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={String(defaultPrice)}
          placeholder="0,00 — use 0 para gratuito"
        />
        {fieldErrors?.price && <p className="text-sm text-red-600">{fieldErrors.price[0]}</p>}
      </div>

      {/* Início */}
      <div className="space-y-2">
        <Label htmlFor="startsAt">
          {kind === "daily" ? "Data de início" : "Início"} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="startsAt"
          name="startsAt"
          type={inputType}
          required
          aria-invalid={!!fieldErrors?.startsAt}
        />
        {fieldErrors?.startsAt && <p className="text-sm text-red-600">{fieldErrors.startsAt[0]}</p>}
      </div>

      {/* Término */}
      <div className="space-y-2">
        <Label htmlFor="endsAt">
          {kind === "daily" ? "Data de término" : "Término"} <span className="text-red-500">*</span>
        </Label>
        <Input
          id="endsAt"
          name="endsAt"
          type={inputType}
          required
          aria-invalid={!!fieldErrors?.endsAt}
        />
        {fieldErrors?.endsAt && <p className="text-sm text-red-600">{fieldErrors.endsAt[0]}</p>}
      </div>

      {/* Observações */}
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={2} placeholder="Opcional..." maxLength={500} />
      </div>

      <div className="flex justify-end md:col-span-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Registrando..." : "Confirmar aluguel"}
    </Button>
  );
}
