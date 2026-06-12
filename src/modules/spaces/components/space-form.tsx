"use client";

import { useActionState, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { createSpaceAction } from "../actions/create-space";
import type { Space } from "../types";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type Props = {
  /** Quando passado, o form atua em modo de edição */
  space?: Space;
  /** Action de update vinculada ao espaço específico (bind parcial) */
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function SpaceForm({ space, updateAction }: Props) {
  const action = updateAction ?? createSpaceAction;
  const [state, formAction] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (state.ok) {
      if (!space) formRef.current?.reset();
      toast.success(state.message ?? "Salvo com sucesso.");
      return;
    }
    if (state.message) toast.error(state.message);
  }, [state, space]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="name">
          Nome <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={space?.name}
          placeholder="Ex: Sala de reunião, Salão de festas..."
          aria-invalid={!!fieldErrors?.name}
        />
        {fieldErrors?.name && <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>}
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={space?.description ?? ""}
          placeholder="Descrição opcional..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Localização</Label>
        <Input
          id="location"
          name="location"
          defaultValue={space?.location ?? ""}
          placeholder="Endereço, andar, sala..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="capacity">Capacidade (pessoas)</Label>
        <Input
          id="capacity"
          name="capacity"
          type="number"
          min="1"
          step="1"
          defaultValue={space?.capacity != null ? String(space.capacity) : ""}
          placeholder="Opcional"
        />
        {fieldErrors?.capacity && <p className="text-sm text-red-600">{fieldErrors.capacity[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="defaultPrice">Valor padrão (R$)</Label>
        <Input
          id="defaultPrice"
          name="defaultPrice"
          type="number"
          step="0.01"
          min="0"
          defaultValue={String(space?.default_price ?? 0)}
          placeholder="0,00 — use 0 para gratuito"
        />
        {fieldErrors?.defaultPrice && (
          <p className="text-sm text-red-600">{fieldErrors.defaultPrice[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="bookingMode">
          Modo de reserva <span className="text-red-500">*</span>
        </Label>
        <Select name="bookingMode" defaultValue={space?.booking_mode ?? "both"}>
          <SelectTrigger id="bookingMode">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Por dia</SelectItem>
            <SelectItem value="hourly">Por horário</SelectItem>
            <SelectItem value="both">Por dia ou horário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 md:col-span-2">
        <Switch
          id="isActive"
          name="isActive"
          value="true"
          defaultChecked={space?.is_active ?? true}
        />
        <Label htmlFor="isActive">Espaço ativo (disponível para aluguel)</Label>
      </div>

      <div className="flex justify-end gap-2 md:col-span-2">
        <SubmitButton isEditing={!!space} />
      </div>
    </form>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : isEditing ? "Salvar alterações" : "Cadastrar espaço"}
    </Button>
  );
}
