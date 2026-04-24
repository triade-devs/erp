"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteMemberAction } from "@/modules/tenancy";
import type { CompanyRole } from "@/modules/tenancy";

type Props = {
  companyId: string;
  roles: CompanyRole[];
};

export function InviteMemberDialog({ companyId, roles }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleRole(id: string) {
    setSelectedRoles((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setMessage(null);
    startTransition(async () => {
      const result = await inviteMemberAction(companyId, email, selectedRoles);
      if (result.ok) {
        setEmail("");
        setSelectedRoles([]);
        setOpen(false);
      }
      setMessage({
        ok: result.ok,
        text: result.message ?? (result.ok ? "Convite enviado" : "Erro"),
      });
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="sm">
        + Convidar membro
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">Convidar membro</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">
              E-mail <span className="text-red-500">*</span>
            </Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
            />
          </div>

          {roles.length > 0 && (
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="space-y-1">
                {roles.map((role) => (
                  <label key={role.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selectedRoles.includes(role.id)}
                      onChange={() => toggleRole(role.id)}
                    />
                    {role.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {message && (
            <p className={`text-sm ${message.ok ? "text-green-700" : "text-destructive"}`}>
              {message.text}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setMessage(null);
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enviando..." : "Enviar convite"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
