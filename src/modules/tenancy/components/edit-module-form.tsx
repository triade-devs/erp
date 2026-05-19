"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateModuleAction } from "../actions/update-module";
import type { ActionResult } from "@/lib/errors";
import type { Tables } from "@/types/database.types";

type Props = { module: Tables<"modules"> };

const initial: ActionResult = { ok: false };

export function EditModuleForm({ module }: Props) {
  const boundAction = updateModuleAction.bind(null, module.code);
  const [state, formAction] = useActionState(boundAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (state.ok) {
      toast.success(state.message ?? "Salvo com sucesso.");
      return;
    }

    if (state.message) toast.error(state.message);
  }, [state]);

  const errors = state.ok ? undefined : state.fieldErrors;

  return (
    <form ref={formRef} action={formAction} className="max-w-lg space-y-4">
      <div className="space-y-1">
        <Label>Código</Label>
        <Input value={module.code} disabled className="font-mono" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={module.name} required />
        {errors?.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={module.description ?? ""}
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="icon">Ícone</Label>
        <Input id="icon" name="icon" defaultValue={module.icon ?? ""} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="sort_order">Ordem</Label>
        <Input id="sort_order" name="sort_order" type="number" defaultValue={module.sort_order} />
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar alterações"}
    </Button>
  );
}
