"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPrescriptionAction } from "../actions/create-prescription";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type Item = {
  medication: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
};

export function PrescriptionForm({ patientId }: { patientId: string }) {
  const [state, formAction] = useActionState(createPrescriptionAction, initial);
  const [items, setItems] = useState<Item[]>([{ medication: "" }]);
  const jsonItems = useMemo(() => JSON.stringify(items), [items]);

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Prescrição criada");
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="patientId" value={patientId} />
      <input type="hidden" name="items" value={jsonItems} />

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
            <Field
              label="Medicamento"
              value={item.medication}
              onChange={(value) => updateItem(index, "medication", value, setItems)}
            />
            <Field
              label="Dose"
              value={item.dosage ?? ""}
              onChange={(value) => updateItem(index, "dosage", value, setItems)}
            />
            <Field
              label="Via"
              value={item.route ?? ""}
              onChange={(value) => updateItem(index, "route", value, setItems)}
            />
            <Field
              label="Frequência"
              value={item.frequency ?? ""}
              onChange={(value) => updateItem(index, "frequency", value, setItems)}
            />
            <Field
              label="Duração"
              value={item.duration ?? ""}
              onChange={(value) => updateItem(index, "duration", value, setItems)}
            />
            <Field
              label="Quantidade"
              value={item.quantity ?? ""}
              onChange={(value) => updateItem(index, "quantity", value, setItems)}
            />
            <div className="space-y-2 md:col-span-2">
              <Label>Orientações</Label>
              <Textarea
                value={item.instructions ?? ""}
                onChange={(event) =>
                  updateItem(index, "instructions", event.target.value, setItems)
                }
              />
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={() => setItems((current) => [...current, { medication: "" }])}
      >
        Adicionar medicamento
      </Button>

      <div className="space-y-2">
        <Label htmlFor="generalInstructions">Orientações gerais</Label>
        <Textarea id="generalInstructions" name="generalInstructions" rows={4} />
      </div>
      <SubmitButton />
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function updateItem(
  index: number,
  key: keyof Item,
  value: string,
  setItems: React.Dispatch<React.SetStateAction<Item[]>>,
) {
  setItems((current) =>
    current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Criar prescrição"}
    </Button>
  );
}
