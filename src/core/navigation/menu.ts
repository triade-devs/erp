export type MenuItem = {
  label: string;
  href: string;
  icon?: string;
  roles?: string[];
  requiresModule?: string;
  requiresPermission?: string;
  /** Se true, o layout prefixará o href com `/<companySlug>` */
  requiresSlug?: boolean;
};

export const MODULES_MENU: MenuItem[] = [
  { label: "Início", href: "/", icon: "home" },
  {
    label: "Estoque",
    href: "/inventory",
    icon: "package",
    requiresSlug: true,
    requiresPermission: "inventory:product:read",
  },
  {
    label: "Movimentações",
    href: "/inventory/movements",
    icon: "arrow-left-right",
    requiresSlug: true,
    requiresPermission: "movements:movement:read",
  },
  {
    label: "Auditoria",
    href: "/audit",
    icon: "shield-check",
    requiresSlug: true,
    requiresPermission: "core:audit:read",
  },
  {
    label: "Configurações",
    href: "/settings/general",
    icon: "settings",
    requiresSlug: true,
    requiresPermission: "core:company:update",
  },
];

export const ADMIN_MENU: MenuItem[] = [
  { label: "Empresas", href: "/admin/companies", icon: "building-2" },
  { label: "Auditoria Global", href: "/admin/audit", icon: "activity" },
];
