"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  ArrowLeftRight,
  ShieldCheck,
  Settings,
  Building2,
  Activity,
  BookOpen,
  Puzzle,
  Shield,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/core/navigation/menu";

const ICON_MAP: Record<string, LucideIcon> = {
  home: Home,
  package: Package,
  "arrow-left-right": ArrowLeftRight,
  "shield-check": ShieldCheck,
  settings: Settings,
  "building-2": Building2,
  activity: Activity,
  "book-open": BookOpen,
  puzzle: Puzzle,
  shield: Shield,
  truck: Truck,
};

type ResolvedItem = MenuItem & { resolvedHref: string };

type Props = {
  items: ResolvedItem[];
  groupLabel?: string;
};

export function SidebarNav({ items, groupLabel }: Props) {
  const pathname = usePathname();

  // Agrupa itens preservando ordem de primeira aparição
  const sections: { label: string | undefined; items: ResolvedItem[] }[] = [];
  const seen = new Map<string | undefined, ResolvedItem[]>();
  for (const item of items) {
    const key = item.group;
    if (!seen.has(key)) {
      const bucket: ResolvedItem[] = [];
      seen.set(key, bucket);
      sections.push({ label: key, items: bucket });
    }
    seen.get(key)!.push(item);
  }

  function isActive(item: ResolvedItem) {
    if (item.resolvedHref === "/") return pathname === "/";
    if (!pathname.startsWith(item.resolvedHref)) return false;
    return !items.some(
      (other) =>
        other.resolvedHref !== item.resolvedHref &&
        other.resolvedHref.startsWith(item.resolvedHref) &&
        pathname.startsWith(other.resolvedHref),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groupLabel && (
        <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
          {groupLabel}
        </p>
      )}

      {sections.map((section, i) => (
        <div key={section.label ?? `__root_${i}`}>
          {section.label && (
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
              {section.label}
            </p>
          )}
          <nav className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const Icon = item.icon ? ICON_MAP[item.icon] : null;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.resolvedHref}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-sidebar-active bg-sidebar-active-bg font-medium text-sidebar-active"
                      : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
    </div>
  );
}
