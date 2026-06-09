"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
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
import { cancelRentalAction } from "../actions/cancel-rental";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

export function CancelRentalButton({ rentalId, spaceId }: { rentalId: string; spaceId: string }) {
  const [state, formAction] = useActionState(cancelRentalAction, initial);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (state.ok) toast.success(state.message ?? "Aluguel cancelado");
    else if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
          Cancelar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancelar aluguel?</AlertDialogTitle>
          <AlertDialogDescription>
            O período ficará livre novamente. O registro é mantido como cancelado no histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <form action={formAction}>
            <input type="hidden" name="rentalId" value={rentalId} />
            <input type="hidden" name="spaceId" value={spaceId} />
            <ConfirmButton />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <AlertDialogAction type="submit" disabled={pending} className="bg-red-600 hover:bg-red-700">
      {pending ? "Cancelando..." : "Confirmar cancelamento"}
    </AlertDialogAction>
  );
}
