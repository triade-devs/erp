"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createModuleAction } from "../actions/create-module";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

export function CreateModuleForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(createModuleAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (state.ok) {
      formRef.current?.reset();
      toast.success(state.message ?? "Salvo com sucesso.");
      router.push("/admin/platform/modules");
      return;
    }

    if (state.message) toast.error(state.message);
  }, [state, router]);

  const errors = state.ok ? undefined : state.fieldErrors;

  return (
    <form ref={formRef} action={formAction} className="max-w-lg space-y-4">
      <div className="space-y-1">
        <Label htmlFor="code">Código</Label>
        <Input id="code" name="code" placeholder="ex: crm" pattern="[a-z0-9\-]+" required />
        {errors?.code && <p className="text-sm text-destructive">{errors.code[0]}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" placeholder="ex: CRM" required />
        {errors?.name && <p className="text-sm text-destructive">{errors.name[0]}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" placeholder="Opcional" rows={2} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="icon">Ícone</Label>
        <Input id="icon" name="icon" placeholder="ex: briefcase" />
      </div>

      <div className="space-y-1">
        <Label htmlFor="sort_order">Ordem</Label>
        <Input id="sort_order" name="sort_order" type="number" defaultValue={100} />
      </div>

      <input type="hidden" name="is_system" value="false" />

      <div className="flex gap-2">
        <SubmitButton />
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/platform/modules")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Criando..." : "Criar módulo"}
    </Button>
  );
}
