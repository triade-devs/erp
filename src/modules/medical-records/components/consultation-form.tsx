"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createConsultationAction } from "../actions/create-consultation";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

export function ConsultationForm({ patientId }: { patientId: string }) {
  const [state, formAction] = useActionState(createConsultationAction, initial);

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Consulta salva");
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="space-y-2">
        <Label htmlFor="consultationAt">Data e hora</Label>
        <Input id="consultationAt" name="consultationAt" type="datetime-local" required />
      </div>
      <Area name="chiefComplaint" label="Queixa principal" />
      <Area name="anamnesisSummary" label="Anamnese" rows={5} />
      <Area name="clinicalEvolution" label="Evolução clínica" rows={5} />
      <Area name="diagnosisText" label="Hipótese/diagnóstico" />
      <Area name="conduct" label="Conduta" rows={4} />
      <Area name="notes" label="Observações" />
      <SubmitButton label="Registrar consulta" />
    </form>
  );
}

function Area({ name, label, rows = 3 }: { name: string; label: string; rows?: number }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={rows} />
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}
