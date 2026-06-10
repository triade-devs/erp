"use client";

import { useState } from "react";
import { toast } from "sonner";
import { resetRoleFromTemplateAction } from "@/modules/tenancy/client";
import { Button } from "@/components/ui/button";
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
  companyId: string;
  roleId: string;
  roleName: string;
};

export function ResetTemplateButton({ companyId, roleId, roleName }: Props) {
  const [isPending, setIsPending] = useState(false);

  async function handleReset() {
    setIsPending(true);
    const r = await resetRoleFromTemplateAction(companyId, roleId);
    setIsPending(false);
    if (r.ok) toast.success(r.message ?? "Resetado");
    else toast.error(r.message ?? "Erro");
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs" disabled={isPending}>
          {isPending ? "Resetando..." : "Resetar do template"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resetar {roleName} para o template?</AlertDialogTitle>
          <AlertDialogDescription>
            Todas as permissões customizadas desta role serão perdidas e substituídas pelas do
            template.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleReset}>Resetar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
