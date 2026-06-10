import { notFound } from "next/navigation";
import {
  resolveCompany,
  listCompanyMembers,
  listManageableRoles,
  listPendingInvitations,
  type CompanyRole,
} from "@/modules/tenancy";
import { listResetRequestsForCompany } from "@/modules/auth";
import { Can } from "@/modules/authz";
import { AppError } from "@/lib/errors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InviteMemberDialog } from "./invite-member-dialog";
import { MemberCard } from "./member-card";
import { PendingInvitationsTab } from "./pending-invitations-tab";
import { ResetRequestsTab } from "./reset-requests-tab";

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

  const [members, manageableRoles, invitations, resetRequests] = await Promise.all([
    listCompanyMembers(company.id),
    listManageableRoles(company.id),
    listPendingInvitations(company.id),
    listResetRequestsForCompany(company.id),
  ]);

  // ManageableRole carrega apenas campos relevantes para atribuição.
  // Adaptamos ao shape CompanyRole exigido pelos componentes UI (InviteMemberDialog,
  // MemberCard, MemberRolesSheet) preenchendo campos não usados com defaults seguros.
  const rolesForUi: CompanyRole[] = manageableRoles.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: null,
    isSystem: false,
    templateCode: null,
    syncedAt: null,
    divergent: false,
    parentRoleId: null,
    hierarchyLevel: r.hierarchyLevel,
  }));

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Membros</h2>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? "membro" : "membros"} nesta empresa
          </p>
        </div>
        <Can permission="core:invitation:create">
          <InviteMemberDialog companyId={company.id} roles={rolesForUi} />
        </Can>
      </div>

      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Ativos ({members.length})</TabsTrigger>
          <TabsTrigger value="convites">Convites ({invitations.length})</TabsTrigger>
          <TabsTrigger value="resets">Resets ({resetRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="ativos">
          {members.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Nenhum membro cadastrado.</p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <MemberCard
                  key={member.membershipId}
                  member={member}
                  companyId={company.id}
                  availableRoles={rolesForUi}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="convites">
          <PendingInvitationsTab companyId={company.id} initialInvitations={invitations} />
        </TabsContent>

        <TabsContent value="resets">
          <ResetRequestsTab companyId={company.id} initialRequests={resetRequests} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
