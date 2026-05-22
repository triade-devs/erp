import { redirect } from "next/navigation";
import { Package } from "lucide-react";
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

  const userInitials = user.email ? user.email.slice(0, 2).toUpperCase() : "??";

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="flex h-screen flex-col border-r border-sidebar-border bg-sidebar">
        {/* Brand */}
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            ERP Modular
          </span>
        </div>

        {/* Company switcher */}
        <div className="border-b border-sidebar-border px-3 py-2">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            Empresa
          </p>
          <CompanySwitcher companies={companies} activeCompanyId={activeCompanyId} />
        </div>

        {/* Nav — scrollável */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <div className="flex flex-col gap-1">
            <SidebarNav items={filteredModules} />
            {isPlatformAdmin && (
              <>
                <div className="my-2 border-t border-sidebar-border" />
                <SidebarNav items={adminItems} groupLabel="Plataforma" />
              </>
            )}
          </div>
        </div>

        {/* User footer */}
        <div className="border-t border-sidebar-border px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {userInitials}
            </div>
            <p className="min-w-0 flex-1 truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </p>
            <form action={signOutAction}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                Sair
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
