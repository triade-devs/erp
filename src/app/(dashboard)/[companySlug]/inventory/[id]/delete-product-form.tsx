"use client";

import { useActionState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type Props = {
  deleteAction: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  isActive: boolean;
};

export function DeleteProductForm({ deleteAction, isActive }: Props) {
  const [state, formAction] = useActionState(deleteAction, initial);

  useEffect(() => {
    if (!state.ok && state.message) toast.error(state.message);
  }, [state]);

  if (!isActive) {
    return <p className="text-sm text-muted-foreground">Este produto já está inativo.</p>;
  }

  return (
    <form action={formAction}>
      <SubmitButton />
    </form>
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
