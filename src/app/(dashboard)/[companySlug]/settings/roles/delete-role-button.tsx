"use client";

import { useTransition } from "react";
import { toast } from "sonner";
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
import { deleteRoleAction } from "@/modules/tenancy/client";

type Props = {
  companyId: string;
  roleId: string;
  roleName: string;
};

export function DeleteRoleButton({ companyId, roleId, roleName }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRoleAction(companyId, roleId);
      if (result.ok) {
        toast.success(result.message ?? "Role excluída");
      } else {
        toast.error(result.message ?? "Erro ao excluir role");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          disabled={isPending}
        >
          {isPending ? "Excluindo..." : "Excluir"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir role</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a role &quot;{roleName}&quot;? Esta ação não pode ser
            desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
