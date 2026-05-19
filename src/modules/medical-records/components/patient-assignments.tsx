"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignPatientAction } from "../actions/assign-patient";
import type { AssignableMember } from "../queries/list-assignable-members";
import type { MedicalPatientAssignment } from "../types";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

export function PatientAssignments({
  patientId,
  members,
  assignments,
}: {
  patientId: string;
  members: AssignableMember[];
  assignments: MedicalPatientAssignment[];
}) {
  const [state, formAction] = useActionState(assignPatientAction, initial);

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Vínculo salvo");
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  const memberName = new Map(members.map((m) => [m.membershipId, m.fullName]));

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 text-sm font-medium">Equipe vinculada</div>
        <div className="divide-y">
          {assignments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Nenhum profissional vinculado.
            </p>
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>{memberName.get(assignment.membership_id) ?? assignment.membership_id}</span>
                <span className="text-muted-foreground">
                  {assignment.is_primary
                    ? "Responsável principal"
                    : relationshipLabel(assignment.relationship)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <form
        action={formAction}
        className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_180px_auto]"
      >
        <input type="hidden" name="patientId" value={patientId} />
        <div className="space-y-2">
          <Label>Profissional</Label>
          <Select name="membershipId">
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {members.map((member) => (
                <SelectItem key={member.membershipId} value={member.membershipId}>
                  {member.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Vínculo</Label>
          <Select name="relationship" defaultValue="physician">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary_physician">Responsável</SelectItem>
              <SelectItem value="physician">Médico</SelectItem>
              <SelectItem value="nursing">Enfermagem</SelectItem>
              <SelectItem value="assistant">Assistente</SelectItem>
              <SelectItem value="therapist">Terapeuta</SelectItem>
              <SelectItem value="other">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}

function relationshipLabel(value: string) {
  const labels: Record<string, string> = {
    primary_physician: "Responsável",
    physician: "Médico",
    nursing: "Enfermagem",
    assistant: "Assistente",
    therapist: "Terapeuta",
    other: "Outro",
  };
  return labels[value] ?? value;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Vinculando..." : "Vincular"}
    </Button>
  );
}
