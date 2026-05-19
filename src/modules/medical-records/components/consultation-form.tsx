"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createConsultationAction } from "../actions/create-consultation";
import { extractAnamnesisSummary } from "../services/clinical-service";
import type { MedicalConsultationWithAnamneses } from "../types";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type Props = {
  patientId: string;
  consultation?: MedicalConsultationWithAnamneses;
  action?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function ConsultationForm({ patientId, consultation, action }: Props) {
  const [state, formAction] = useActionState(action ?? createConsultationAction, initial);

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Consulta salva com sucesso");
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="space-y-2">
        <Label htmlFor="consultationAt">Data e hora</Label>
        <Input
          id="consultationAt"
          name="consultationAt"
          type="datetime-local"
          defaultValue={toDateTimeLocal(consultation?.consultation_at)}
          required
        />
      </div>
      <Area
        name="chiefComplaint"
        label="Queixa principal"
        defaultValue={consultation?.chief_complaint ?? ""}
      />
      <Area
        name="anamnesisSummary"
        label="Anamnese"
        rows={5}
        defaultValue={extractAnamnesisSummary(consultation?.medical_anamneses)}
      />
      <Area
        name="clinicalEvolution"
        label="Evolução clínica"
        rows={5}
        defaultValue={consultation?.clinical_evolution ?? ""}
      />
      <Area
        name="diagnosisText"
        label="Hipótese/diagnóstico"
        defaultValue={consultation?.diagnosis_text ?? ""}
      />
      <Area name="conduct" label="Conduta" rows={4} defaultValue={consultation?.conduct ?? ""} />
      <Area name="notes" label="Observações" defaultValue={consultation?.notes ?? ""} />
      <SubmitButton label={consultation ? "Salvar alterações" : "Registrar consulta"} />
    </form>
  );
}

function Area({
  name,
  label,
  rows = 3,
  defaultValue = "",
}: {
  name: string;
  label: string;
  rows?: number;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={rows} defaultValue={defaultValue} />
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

function toDateTimeLocal(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
