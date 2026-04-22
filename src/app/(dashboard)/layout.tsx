import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { MODULES_MENU } from "@/core/navigation/menu";
import { getCurrentUser } from "@/modules/auth";
import { CompanySwitcher, listMyCompanies, getActiveCompanyId } from "@/modules/tenancy";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [companies, activeCompanyId] = await Promise.all([listMyCompanies(), getActiveCompanyId()]);

  return (
    <div className="grid min-h-screen grid-cols-[240px_1fr]">
      {/* Sidebar */}
      <aside className="border-r bg-muted/30 p-4">
        <div className="mb-8">
          <h2 className="text-lg font-bold tracking-tight">ERP</h2>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>

        <nav className="flex flex-col gap-1">
          {MODULES_MENU.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
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
