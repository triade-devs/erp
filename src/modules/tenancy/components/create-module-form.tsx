"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createModuleAction } from "../actions/create-module";

const initial = { ok: true as const };

export function CreateModuleForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createModuleAction, initial);

  useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message);
      router.push("/admin/platform/modules");
    } else if (!state.ok && state.message && !("fieldErrors" in state)) {
      toast.error(state.message);
    }
  }, [state, router]);

  const errors = !state.ok && "fieldErrors" in state ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-lg space-y-4">
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
        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar módulo"}
        </Button>
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
