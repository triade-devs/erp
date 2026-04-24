"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateMemberStatusAction } from "@/modules/tenancy/client";

type Props = {
  companyId: string;
  membershipId: string;
  currentStatus: string;
};

export function MemberStatusButton({ companyId, membershipId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAction(status: "active" | "suspended" | "removed") {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberStatusAction(companyId, membershipId, status);
      if (!result.ok) setError(result.message ?? "Erro ao atualizar status");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {currentStatus === "active" && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => handleAction("suspended")}
          >
            Suspender
          </Button>
        )}
        {currentStatus === "suspended" && (
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => handleAction("active")}
          >
            Reativar
          </Button>
        )}
        {(currentStatus === "invited" || currentStatus === "suspended") && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => handleAction("removed")}
          >
            Remover
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
