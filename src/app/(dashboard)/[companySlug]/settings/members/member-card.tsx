"use client";

import { useTransition, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { updateMemberStatusAction } from "@/modules/tenancy/client";
import type { CompanyMember, CompanyRole } from "@/modules/tenancy";
import { MemberRolesSheet } from "./member-roles-sheet";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "active") return "default";
  if (status === "invited") return "secondary";
  return "destructive";
}

function statusLabel(status: string): string {
  if (status === "active") return "Ativo";
  if (status === "invited") return "Convidado";
  if (status === "suspended") return "Suspenso";
  return status;
}

type Props = {
  member: CompanyMember;
  companyId: string;
  availableRoles: CompanyRole[];
};

export function MemberCard({ member, companyId, availableRoles }: Props) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(member.status);

  function handleStatusChange(newStatus: "active" | "suspended" | "removed") {
    startTransition(async () => {
      const result = await updateMemberStatusAction(companyId, member.membershipId, newStatus);
      if (result.ok) {
        if (newStatus === "removed") {
          toast.success("Membro removido");
        } else {
          setCurrentStatus(newStatus);
          toast.success(result.message ?? "Status atualizado");
        }
      } else {
        toast.error(result.message ?? "Erro ao atualizar status");
      }
    });
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center gap-3 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(member.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold">{member.fullName}</p>
            {member.isOwner && (
              <Badge variant="outline" className="shrink-0 text-xs">
                owner
              </Badge>
            )}
          </div>
          <Badge variant={statusVariant(currentStatus)} className="mt-0.5 text-xs">
            {statusLabel(currentStatus)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="mb-1.5 text-xs text-muted-foreground">Roles</p>
        {member.roles.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">Sem roles atribuídas</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {member.roles.map((role) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                {role.name}
              </Badge>
            ))}
          </div>
        )}
        {member.joinedAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Entrou em {new Date(member.joinedAt).toLocaleDateString("pt-BR")}
          </p>
        )}
      </CardContent>

      {!member.isOwner && (
        <CardFooter className="flex flex-wrap gap-1 border-t pt-0">
          <MemberRolesSheet
            companyId={companyId}
            membershipId={member.membershipId}
            memberName={member.fullName}
            availableRoles={availableRoles}
            currentRoleIds={member.roles.map((r) => r.id)}
          />

          {currentStatus === "active" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              disabled={isPending}
              onClick={() => handleStatusChange("suspended")}
            >
              Suspender
            </Button>
          )}
          {currentStatus === "suspended" && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              disabled={isPending}
              onClick={() => handleStatusChange("active")}
            >
              Reativar
            </Button>
          )}
          {(currentStatus === "invited" ||
            currentStatus === "suspended" ||
            currentStatus === "active") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              disabled={isPending}
              onClick={() => handleStatusChange("removed")}
            >
              Remover
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
