"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateRoleTemplateAction, deleteRoleTemplateAction } from "@/modules/tenancy/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  code: string;
  initialValues: { name: string; description: string | null; sort_order: number };
  isSystem: boolean;
};

const initial = { ok: true as const };

export function EditTemplateForm({ code, initialValues, isSystem }: Props) {
  const router = useRouter();
  const action = updateRoleTemplateAction.bind(null, code);
  const [state, formAction, isPending] = useActionState(action, initial);

  useEffect(() => {
    if (state !== initial) {
      if (state.ok) toast.success(state.message ?? "Atualizado");
      else toast.error(state.message ?? "Erro");
    }
  }, [state]);

  async function handleDelete() {
    const r = await deleteRoleTemplateAction(code);
    if (r.ok) {
      toast.success(r.message ?? "Deletado");
      router.push("/admin/platform/role-templates");
    } else {
      toast.error(r.message ?? "Erro");
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" defaultValue={initialValues.name} required />
        </div>
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={initialValues.description ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="sort_order">Ordem</Label>
          <Input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={initialValues.sort_order}
          />
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar"}
        </Button>
      </form>

      {!isSystem && (
        <div className="border-t pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                Deletar template
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deletar template {initialValues.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Roles em empresas que apontam para este template perdem a referência
                  (template_code = null). Instâncias não são removidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Deletar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
