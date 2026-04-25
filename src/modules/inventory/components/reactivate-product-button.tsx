"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/errors";

type Props = {
  productId: string;
  onReactivate: (id: string) => Promise<ActionResult>;
};

export function ReactivateProductButton({ productId, onReactivate }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await onReactivate(productId);
        })
      }
    >
      {isPending ? "Reativando..." : "Reativar"}
    </Button>
  );
}
