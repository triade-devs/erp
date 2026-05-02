import { redirect } from "next/navigation";
import { signOutAction } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { MODULES_MENU, ADMIN_MENU } from "@/core/navigation/menu";
import { getCurrentUser } from "@/modules/auth";
import { CompanySwitcher, listMyCompanies, getActiveCompanyId } from "@/modules/tenancy";
import { createClient } from "@/lib/supabase/server";
import { getEffectivePermissions } from "@/modules/authz";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [companies, activeCompanyId, { data: isPlatformAdmin }] = await Promise.all([
    listMyCompanies(),
    getActiveCompanyId(),
    supabase.rpc("is_platform_admin"),
  ]);

  const userPerms = activeCompanyId
    ? await getEffectivePermissions(activeCompanyId)
    : new Set<string>();

  const activeCompany = companies.find((c) => c.id === activeCompanyId) ?? companies[0];
  const companySlug = activeCompany?.slug ?? "";

  if (!isPlatformAdmin) {
    const hasNoCompany = companies.length === 0;
    const activeMembership = user.memberships?.find((m) => m.companyId === activeCompany?.id);
    const hasNoRole =
      !!activeCompany &&
      !!activeMembership &&
      !activeMembership.isOwner &&
      activeMembership.roles.length === 0;
    if (hasNoCompany || hasNoRole) redirect("/sem-acesso");
  }

  const filteredModules = MODULES_MENU.filter((item) => {
    if (!item.requiresPermission) return true;
    if (isPlatformAdmin) return true;
    return userPerms.has(item.requiresPermission) || userPerms.has("*");
  }).map((item) => ({
    ...item,
    resolvedHref: item.requiresSlug && companySlug ? `/${companySlug}${item.href}` : item.href,
  }));

  const adminItems = ADMIN_MENU.map((item) => ({ ...item, resolvedHref: item.href }));

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="border-r bg-muted/30 p-4">
        <div className="mb-8">
          <h2 className="text-lg font-bold tracking-tight">ERP</h2>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>

        <div className="flex flex-col gap-4">
          <SidebarNav items={filteredModules} />
          {isPlatformAdmin && <SidebarNav items={adminItems} groupLabel="Plataforma" />}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b px-8 py-3">
          <CompanySwitcher companies={companies} activeCompanyId={activeCompanyId} />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sair
            </Button>
          </form>
        </header>

        <div className="flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
