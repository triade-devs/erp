"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateMemberRolesAction } from "@/modules/tenancy/client";
import type { CompanyRole } from "@/modules/tenancy";

type Props = {
  companyId: string;
  membershipId: string;
  availableRoles: CompanyRole[];
  currentRoleIds: string[];
  backHref: string;
};

export function UpdateMemberRolesForm({
  companyId,
  membershipId,
  availableRoles,
  currentRoleIds,
  backHref,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(currentRoleIds);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleRole(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateMemberRolesAction(companyId, membershipId, selected);
      setMessage({ ok: result.ok, text: result.message ?? (result.ok ? "Salvo" : "Erro") });
      if (result.ok) {
        router.push(backHref);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Roles disponíveis</Label>
        {availableRoles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma role cadastrada nesta empresa.</p>
        ) : (
          <div className="space-y-2 rounded-md border p-4">
            {availableRoles.map((role) => (
              <label key={role.id} className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selected.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                />
                <div>
                  <span className="font-medium">{role.name}</span>
                  {role.isSystem && (
                    <span className="ml-2 rounded bg-muted px-1 py-0.5 text-xs text-muted-foreground">
                      sistema
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {message && (
        <p className={`text-sm ${message.ok ? "text-green-700" : "text-destructive"}`}>
          {message.text}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(backHref)}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar roles"}
        </Button>
      </div>
    </form>
  );
}
