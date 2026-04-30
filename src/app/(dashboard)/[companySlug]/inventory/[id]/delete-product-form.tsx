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
  deleteAction: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  isActive: boolean;
  redirectTo: string;
};

export function DeleteProductForm({ deleteAction, isActive, redirectTo }: Props) {
  const [state, formAction] = useActionState(deleteAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message ?? "Produto desativado com sucesso");
      router.push(redirectTo);
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state, redirectTo, router]);

  if (!isActive) {
    return <p className="text-sm text-muted-foreground">Este produto já está inativo.</p>;
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="destructive">
          Desativar produto
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar produto?</AlertDialogTitle>
          <AlertDialogDescription>
            O produto será marcado como inativo. O histórico de movimentações é preservado. Esta
            ação pode ser revertida reativando o produto.
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
      {pending ? "Desativando..." : "Desativar produto"}
    </Button>
  );
}
