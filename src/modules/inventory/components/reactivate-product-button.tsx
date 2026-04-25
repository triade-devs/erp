"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { reactivateProductAction } from "@/modules/inventory";

export function ReactivateProductButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await reactivateProductAction(productId);
        })
      }
    >
      {isPending ? "Reativando..." : "Reativar"}
    </Button>
  );
}
