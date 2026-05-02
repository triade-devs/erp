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
import { acceptConsentAction, createConsentTemplateAction } from "../actions/consent-actions";
import type { MedicalConsentTemplate } from "../types";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

export function ConsentTemplateForm() {
  const [state, formAction] = useActionState(createConsentTemplateAction, initial);
  useToast(state);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="body">Texto do termo</Label>
        <Textarea id="body" name="body" rows={10} required />
      </div>
      <SubmitButton label="Salvar modelo" />
    </form>
  );
}

export function ConsentAcceptForm({
  patientId,
  templates,
}: {
  patientId: string;
  templates: MedicalConsentTemplate[];
}) {
  const [state, formAction] = useActionState(acceptConsentAction, initial);
  useToast(state);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="patientId" value={patientId} />
      <div className="space-y-2">
        <Label>Modelo de termo</Label>
        <Select name="templateId">
          <SelectTrigger>
            <SelectValue placeholder="Selecione o termo" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.title} v{template.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      <SubmitButton label="Registrar aceite" />
    </form>
  );
}

function useToast(state: ActionResult) {
  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Salvo com sucesso");
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}
