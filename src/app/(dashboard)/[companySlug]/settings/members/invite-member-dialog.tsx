"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createInvitationAction } from "@/modules/tenancy/client";
import type { CompanyRole } from "@/modules/tenancy";
import { CredentialDisplayDialog } from "./credential-display-dialog";

type Props = {
  companyId: string;
  roles: CompanyRole[];
};

export function InviteMemberDialog({ companyId, roles }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [credentialData, setCredentialData] = useState<{
    link: string;
    shortCode: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleRole(id: string) {
    setSelectedRoles((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setMessage(null);
    startTransition(async () => {
      const result = await createInvitationAction(companyId, email, selectedRoles);
      if (result.ok && result.data) {
        setEmail("");
        setSelectedRoles([]);
        setCredentialData({ link: result.data.link, shortCode: result.data.shortCode });
        return;
      }
      setMessage({
        ok: false,
        text: result.message ?? "Erro ao criar convite",
      });
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm">+ Convidar membro</Button>
        </DialogTrigger>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar membro</DialogTitle>
          </DialogHeader>

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
        </DialogContent>
      </Dialog>

      {credentialData && (
        <CredentialDisplayDialog
          open={!!credentialData}
          onClose={() => {
            setCredentialData(null);
            setOpen(false);
          }}
          link={credentialData.link}
          shortCode={credentialData.shortCode}
          title="Convite gerado"
        />
      )}
    </>
  );
}
