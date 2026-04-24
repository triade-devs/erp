"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function SettingsTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const tabs = [
    { label: "Geral", href: `/${slug}/settings/general` },
    { label: "Membros", href: `/${slug}/settings/members` },
    { label: "Roles", href: `/${slug}/settings/roles` },
  ];
  return (
    <nav className="mb-6 flex gap-4 border-b">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "-mb-px border-b-2 pb-2 text-sm font-medium",
            pathname.startsWith(tab.href)
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
