import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveCompany, listCompanyMembers, listCompanyRoles } from "@/modules/tenancy";
import { Can } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberStatusButton } from "./member-status-button";

export const metadata = { title: "Membros — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
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

export default async function SettingsMembersPage({ params }: Props) {
  const { companySlug } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  const [members, roles] = await Promise.all([
    listCompanyMembers(company.id),
    listCompanyRoles(company.id),
  ]);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Membros</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "membro" : "membros"} nesta empresa
          </p>
        </div>
        <Can permission="core:member:invite">
          <InviteMemberDialog companyId={company.id} roles={roles} />
        </Can>
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
              <TableHead className="w-[160px]">Ações</TableHead>
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
                  <div className="flex items-center gap-2">
                    <Can permission="core:member:manage">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/${companySlug}/settings/members/${member.membershipId}`}>
                          Editar roles
                        </Link>
                      </Button>
                      {!member.isOwner && (
                        <MemberStatusButton
                          companyId={company.id}
                          membershipId={member.membershipId}
                          currentStatus={member.status}
                        />
                      )}
                    </Can>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
