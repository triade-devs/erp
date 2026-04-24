import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveCompany, listCompanyMembers, listCompanyRoles } from "@/modules/tenancy";
import { requirePermission, ForbiddenError } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpdateMemberRolesForm } from "./update-member-roles-form";

export const metadata = { title: "Editar Membro — ERP" };

type Props = {
  params: Promise<{ companySlug: string; memberId: string }>;
};

export default async function MemberEditPage({ params }: Props) {
  const { companySlug, memberId } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  try {
    await requirePermission(company.id, "core:member:manage");
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          Acesso negado: você não tem permissão para gerenciar membros.
        </div>
      );
    }
    throw e;
  }

  const [members, roles] = await Promise.all([
    listCompanyMembers(company.id),
    listCompanyRoles(company.id),
  ]);

  const member = members.find((m) => m.membershipId === memberId);
  if (!member) notFound();

  const currentRoleIds = member.roles.map((r) => r.id);

  return (
    <section className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${companySlug}/settings/members`}>← Membros</Link>
        </Button>
        <div>
          <h2 className="text-lg font-semibold">{member.fullName}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Status:</span>
            <Badge
              variant={
                member.status === "active"
                  ? "default"
                  : member.status === "invited"
                    ? "secondary"
                    : "destructive"
              }
            >
              {member.status}
            </Badge>
            {member.isOwner && <Badge variant="outline">owner</Badge>}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Roles do membro</h3>
        <p className="text-sm text-muted-foreground">
          Selecione as roles que este membro deve ter nesta empresa.
        </p>
      </div>

      <UpdateMemberRolesForm
        companyId={company.id}
        membershipId={memberId}
        availableRoles={roles}
        currentRoleIds={currentRoleIds}
        backHref={`/${companySlug}/settings/members`}
      />
    </section>
  );
}
