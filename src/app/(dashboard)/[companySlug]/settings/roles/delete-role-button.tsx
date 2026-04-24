"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteRoleAction } from "@/modules/tenancy";

type Props = {
  companyId: string;
  roleId: string;
  roleName: string;
};

export function DeleteRoleButton({ companyId, roleId, roleName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`Tem certeza que deseja excluir a role "${roleName}"?`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteRoleAction(companyId, roleId);
      if (!result.ok) setError(result.message ?? "Erro ao excluir role");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={isPending}
        onClick={handleDelete}
      >
        {isPending ? "Excluindo..." : "Excluir"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
