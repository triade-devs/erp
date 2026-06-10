"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRoleTemplateAction } from "@/modules/tenancy/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initial = { ok: true as const };

export function CreateTemplateForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createRoleTemplateAction, initial);

  useEffect(() => {
    if (state.ok && state !== initial) {
      toast.success(state.message ?? "Template criado");
      router.push("/admin/platform/role-templates");
    } else if (!state.ok) {
      toast.error(state.message ?? "Erro");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <Label htmlFor="code">Code (slug)</Label>
        <Input id="code" name="code" required placeholder="ex: viewer" />
      </div>
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required placeholder="ex: Visualizador" />
      </div>
      <div>
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" placeholder="Opcional" />
      </div>
      <div>
        <Label htmlFor="sort_order">Ordem</Label>
        <Input id="sort_order" name="sort_order" type="number" defaultValue={100} />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Criando..." : "Criar template"}
      </Button>
    </form>
  );
}
