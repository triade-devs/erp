import { notFound } from "next/navigation";
import { resolveCompany, listCompanyMembers, listCompanyRoles } from "@/modules/tenancy";
import { Can } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberCard } from "./member-card";

export const metadata = { title: "Membros — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <MemberCard
              key={member.membershipId}
              member={member}
              companyId={company.id}
              availableRoles={roles}
            />
          ))}
        </div>
      )}
    </section>
  );
}
