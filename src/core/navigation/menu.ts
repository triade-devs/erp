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
  { label: "Início", href: "/" },
  {
    label: "Estoque",
    href: "/inventory",
    requiresSlug: true,
    requiresPermission: "inventory:product:read",
  },
  {
    label: "Movimentações",
    href: "/inventory/movements",
    requiresSlug: true,
    requiresPermission: "movements:movement:read",
  },
  { label: "Auditoria", href: "/audit", requiresSlug: true, requiresPermission: "core:audit:read" },
];

export const ADMIN_MENU: MenuItem[] = [{ label: "Empresas", href: "/admin/companies" }];
