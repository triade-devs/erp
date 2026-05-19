"use client";

import { useActionState, useEffect } from "react";
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
import { createPatientAction } from "../actions/create-patient";
import type { MedicalPatient } from "../types";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type Props = {
  patient?: MedicalPatient;
  updateAction?: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

export function PatientForm({ patient, updateAction }: Props) {
  const [state, formAction] = useActionState(updateAction ?? createPatientAction, initial);
  const errors = state.ok ? undefined : state.fieldErrors;

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Salvo com sucesso");
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field
        name="fullName"
        label="Nome completo"
        required
        defaultValue={patient?.full_name}
        error={errors?.fullName?.[0]}
      />
      <Field name="document" label="CPF/documento" defaultValue={patient?.document} />
      <Field
        name="birthDate"
        label="Nascimento"
        type="date"
        defaultValue={patient?.birth_date}
        error={errors?.birthDate?.[0]}
      />
      <div className="space-y-2">
        <Label htmlFor="sex">Sexo</Label>
        <Select name="sex" defaultValue={patient?.sex ?? "unknown"}>
          <SelectTrigger id="sex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unknown">Não informado</SelectItem>
            <SelectItem value="female">Feminino</SelectItem>
            <SelectItem value="male">Masculino</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Field name="phone" label="Telefone" defaultValue={patient?.phone} />
      <Field name="email" label="E-mail" type="email" defaultValue={patient?.email} />
      <Field
        name="emergencyContactName"
        label="Contato de emergência"
        defaultValue={patient?.emergency_contact_name}
      />
      <Field
        name="emergencyContactPhone"
        label="Telefone de emergência"
        defaultValue={patient?.emergency_contact_phone}
      />
      <TextArea name="address" label="Endereço" defaultValue={patient?.address} />
      <TextArea name="notes" label="Observações clínicas" defaultValue={patient?.notes} />
      <div className="flex justify-end md:col-span-2">
        <SubmitButton isEditing={!!patient} />
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | null;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  return (
    <div className="space-y-2 md:col-span-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={3} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : isEditing ? "Salvar paciente" : "Cadastrar paciente"}
    </Button>
  );
}
