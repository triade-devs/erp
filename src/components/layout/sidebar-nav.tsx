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
};

type ResolvedItem = MenuItem & { resolvedHref: string };

type Props = {
  items: ResolvedItem[];
  groupLabel?: string;
};

export function SidebarNav({ items, groupLabel }: Props) {
  const pathname = usePathname();

  return (
    <div>
      {groupLabel && (
        <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {groupLabel}
        </p>
      )}
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon ? ICON_MAP[item.icon] : null;
          const isActive = (() => {
            if (item.resolvedHref === "/") return pathname === "/";
            if (!pathname.startsWith(item.resolvedHref)) return false;
            // yield to any sibling whose href extends this one and also matches
            return !items.some(
              (other) =>
                other.resolvedHref !== item.resolvedHref &&
                other.resolvedHref.startsWith(item.resolvedHref) &&
                pathname.startsWith(other.resolvedHref),
            );
          })();

          return (
            <Link
              key={item.href}
              href={item.resolvedHref}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
