"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Can } from "@/modules/authz/client";
import { approveResetRequestAction, revokeResetRequestAction } from "@/modules/auth/client";
import type { ResetRequestRow } from "@/modules/auth";
import { CredentialDisplayDialog } from "./credential-display-dialog";

const SOURCE_LABELS: Record<string, string> = {
  owner_initiated: "Admin",
};

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Aguardando",
  approved: "Aprovado",
};

type Props = {
  companyId: string;
  initialRequests: ResetRequestRow[];
};

export function ResetRequestsTab({ companyId: _companyId, initialRequests }: Props) {
  const [requests, setRequests] = useState(initialRequests);
  const [credentialData, setCredentialData] = useState<{
    link: string;
    shortCode: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove(req: ResetRequestRow) {
    startTransition(async () => {
      const result = await approveResetRequestAction(req.id);
      if (result.ok && result.data) {
        setCredentialData({ link: result.data.link, shortCode: result.data.shortCode });
        setRequests((prev) =>
          prev.map((r) => (r.id === req.id ? { ...r, status: "approved" } : r)),
        );
      }
    });
  }

  function handleRevoke(req: ResetRequestRow) {
    startTransition(async () => {
      const result = await revokeResetRequestAction(req.id);
      if (result.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== req.id));
      }
    });
  }

  return (
    <Can permission="core:reset_request:read">
      <div className="mt-4">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma solicitação de reset pendente.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Solicitado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{req.email}</TableCell>
                  <TableCell>{SOURCE_LABELS[req.source] ?? req.source}</TableCell>
                  <TableCell>{new Date(req.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{STATUS_LABELS[req.status] ?? req.status}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {req.status === "pending_review" && (
                        <Button
                          type="button"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleApprove(req)}
                        >
                          Aprovar
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isPending}
                        onClick={() => handleRevoke(req)}
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
          title="Reset aprovado"
        />
      )}
    </Can>
  );
}
