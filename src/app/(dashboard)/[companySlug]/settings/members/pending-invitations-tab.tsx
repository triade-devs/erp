"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Can } from "@/modules/authz";
import { revokeInvitationAction, regenerateInvitationAction } from "@/modules/tenancy/client";
import type { PendingInvitation } from "@/modules/tenancy";
import { CredentialDisplayDialog } from "./credential-display-dialog";

type Props = {
  companyId: string;
  initialInvitations: PendingInvitation[];
};

export function PendingInvitationsTab({ companyId: _companyId, initialInvitations }: Props) {
  const router = useRouter();
  const [invitations, setInvitations] = useState(initialInvitations);
  const [credentialData, setCredentialData] = useState<{
    link: string;
    shortCode: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function copyCode(inv: PendingInvitation) {
    navigator.clipboard.writeText(inv.shortCode).then(() => {
      setCopiedId(inv.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function handleRegenerate(inv: PendingInvitation) {
    startTransition(async () => {
      const result = await regenerateInvitationAction(inv.id);
      if (result.ok && result.data) {
        setCredentialData({ link: result.data.link, shortCode: result.data.shortCode });
        router.refresh();
      }
    });
  }

  function handleRevoke(inv: PendingInvitation) {
    startTransition(async () => {
      const result = await revokeInvitationAction(inv.id);
      if (result.ok) {
        setInvitations((prev) => prev.filter((i) => i.id !== inv.id));
      }
    });
  }

  return (
    <Can permission="core:invitation:read">
      <div className="mt-4">
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite pendente.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Convidado por</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.email}</TableCell>
                  <TableCell>{inv.invitedByName}</TableCell>
                  <TableCell>{new Date(inv.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{new Date(inv.expiresAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyCode(inv)}
                      >
                        {copiedId === inv.id ? "Copiado!" : "Copiar código"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRegenerate(inv)}
                      >
                        Regenerar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRevoke(inv)}
                      >
                        Revogar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {credentialData && (
        <CredentialDisplayDialog
          open={!!credentialData}
          onClose={() => setCredentialData(null)}
          link={credentialData.link}
          shortCode={credentialData.shortCode}
          title="Convite regenerado"
        />
      )}
    </Can>
  );
}
