"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
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
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type Props = {
  deactivateAction: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  isActive: boolean;
};

export function DeactivateSupplierForm({ deactivateAction, isActive }: Props) {
  const [state, formAction] = useActionState(deactivateAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Fornecedor desativado");
      router.back();
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, router]);

  if (!isActive) {
    return <p className="text-sm text-muted-foreground">Este fornecedor já está inativo.</p>;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          Desativar fornecedor
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar fornecedor?</AlertDialogTitle>
          <AlertDialogDescription>
            O fornecedor será marcado como inativo. Produtos vinculados não são afetados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => formRef.current?.requestSubmit()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Confirmar desativação
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
      <form ref={formRef} action={formAction} className="hidden">
        <SubmitButton />
      </form>
    </AlertDialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Desativando..." : "Desativar fornecedor"}
    </Button>
  );
}
