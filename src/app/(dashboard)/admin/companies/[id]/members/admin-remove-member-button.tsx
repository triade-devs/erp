"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateMemberStatusAction } from "@/modules/tenancy/client";

type Props = {
  membershipId: string;
  companyId: string;
  memberName: string;
};

export function AdminRemoveMemberButton({ membershipId, companyId, memberName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    if (!confirm(`Remover ${memberName} desta empresa?`)) return;
    startTransition(async () => {
      const result = await updateMemberStatusAction(companyId, membershipId, "removed");
      if (result.ok) {
        toast.success("Membro removido");
        router.refresh();
      } else {
        toast.error(result.message ?? "Erro ao remover membro");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      disabled={isPending}
      onClick={handleRemove}
    >
      Remover
    </Button>
  );
}
