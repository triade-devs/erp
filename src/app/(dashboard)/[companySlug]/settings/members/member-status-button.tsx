"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateMemberStatusAction } from "@/modules/tenancy";

type Props = {
  companyId: string;
  membershipId: string;
  currentStatus: string;
};

export function MemberStatusButton({ companyId, membershipId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleAction(status: "active" | "suspended" | "removed") {
    startTransition(async () => {
      await updateMemberStatusAction(companyId, membershipId, status);
    });
  }

  return (
    <>
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
    </>
  );
}
