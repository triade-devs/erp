import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listCompanyMembers, listAllCompanies } from "@/modules/tenancy";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransferMemberDialog } from "./transfer-member-dialog";
import { AddMemberDialog } from "./add-member-dialog";
import { AdminRemoveMemberButton } from "./admin-remove-member-button";

type Props = {
  params: Promise<{ id: string }>;
};

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

export default async function CompanyMembersPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!company) notFound();

  const [members, allCompanies] = await Promise.all([listCompanyMembers(id), listAllCompanies()]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Membros</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "membro" : "membros"} nesta empresa
          </p>
        </div>
        <AddMemberDialog companyId={id} />
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Entrou em</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.membershipId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.fullName}</span>
                    {member.isOwner && (
                      <Badge variant="outline" className="text-xs">
                        owner
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(member.status)}>{statusLabel(member.status)}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {member.roles.map((role) => (
                      <Badge key={role.id} variant="secondary" className="text-xs">
                        {role.name}
                      </Badge>
                    ))}
                    {member.roles.length === 0 && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell>
                  {!member.isOwner && (
                    <div className="flex items-center gap-1">
                      <TransferMemberDialog
                        membershipId={member.membershipId}
                        memberName={member.fullName}
                        sourceCompanyId={id}
                        allCompanies={allCompanies.map((c) => ({ id: c.id, name: c.name }))}
                      />
                      <AdminRemoveMemberButton
                        membershipId={member.membershipId}
                        companyId={id}
                        memberName={member.fullName}
                      />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
