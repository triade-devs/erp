"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { ActionResult } from "@/lib/errors";

type ParentOption = { id: string; name: string; hierarchyLevel: number };

type Props = {
  action: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  backHref: string;
  submitLabel: string;
  defaultValues?: { name?: string; description?: string; parentRoleId?: string | null };
  availableParents: ParentOption[];
  currentRoleId?: string;
};

const initialState: ActionResult = { ok: false };
const NONE_VALUE = "__none__";

export function RoleForm({
  action,
  backHref,
  submitLabel,
  defaultValues,
  availableParents,
  currentRoleId,
}: Props) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [parentValue, setParentValue] = useState<string>(defaultValues?.parentRoleId ?? NONE_VALUE);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Salvo com sucesso");
      router.push(backHref);
    }
  }, [state.ok, router, backHref, state.message]);

  const fieldErrors = !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          required
          minLength={2}
          maxLength={50}
          placeholder="Ex.: Financeiro"
        />
        {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name[0]}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          maxLength={200}
          rows={3}
          placeholder="Descreva o propósito desta role"
        />
        {fieldErrors.description && (
          <p className="text-sm text-destructive">{fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <input
          type="hidden"
          name="parent_role_id"
          value={parentValue === NONE_VALUE ? "" : parentValue}
        />
        <Label htmlFor="parent_role_id_select">Role superior (opcional)</Label>
        <Select value={parentValue} onValueChange={setParentValue}>
          <SelectTrigger id="parent_role_id_select">
            <SelectValue placeholder="Sem hierarquia (flat)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>Sem hierarquia (flat)</SelectItem>
            {availableParents
              .filter((p) => p.id !== currentRoleId)
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {"  ".repeat(p.hierarchyLevel)}
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Hierarquia controla quem gerencia quem. Não propaga permissões.
        </p>
      </div>

      {!state.ok && state.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state.ok && state.message && <p className="text-sm text-green-700">{state.message}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(backHref)}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
