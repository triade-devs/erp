export type MenuItem = {
  label: string;
  href: string;
  icon?: string;
  /** Agrupa o item sob um label de seção na sidebar */
  group?: string;
  roles?: string[];
  requiresModule?: string;
  requiresPermission?: string;
  /** Se true, o layout prefixará o href com `/<companySlug>` */
  requiresSlug?: boolean;
};

export const MODULES_MENU: MenuItem[] = [
  { label: "Início", href: "/", icon: "home" },
  {
    label: "Produtos",
    href: "/inventory",
    icon: "package",
    group: "Estoque",
    requiresSlug: true,
    requiresPermission: "inventory:product:read",
  },
  {
    label: "Movimentações",
    href: "/inventory/movements",
    icon: "arrow-left-right",
    group: "Estoque",
    requiresSlug: true,
    requiresPermission: "movements:movement:read",
  },
  {
    label: "Fornecedores",
    href: "/suppliers",
    icon: "truck",
    group: "Estoque",
    requiresSlug: true,
    requiresPermission: "suppliers:supplier:read",
  },
  {
    label: "Depósitos",
    href: "/settings/warehouses",
    icon: "warehouse",
    group: "Estoque",
    requiresSlug: true,
    requiresPermission: "core:inventory:manage",
  },
  {
    label: "Espaços",
    href: "/spaces",
    icon: "calendar-days",
    group: "Espaços",
    requiresSlug: true,
    requiresPermission: "spaces:space:read",
  },
  {
    label: "Auditoria",
    href: "/audit",
    icon: "shield-check",
    group: "Empresa",
    requiresSlug: true,
    requiresPermission: "core:audit:read",
  },
  {
    label: "Manual",
    href: "/manual",
    icon: "book-open",
    group: "Empresa",
    requiresSlug: true,
    requiresPermission: "kb:article:read",
  },
  {
    label: "Configurações",
    href: "/settings/general",
    icon: "settings",
    group: "Empresa",
    requiresSlug: true,
    requiresPermission: "core:company:update",
  },
];

export const ADMIN_MENU: MenuItem[] = [
  { label: "Empresas", href: "/admin/companies", icon: "building-2", group: "Gestão" },
  { label: "Auditoria Global", href: "/admin/audit", icon: "activity", group: "Gestão" },
  { label: "Módulos", href: "/admin/platform/modules", icon: "puzzle", group: "Sistema" },
  { label: "Roles", href: "/admin/platform/roles", icon: "shield", group: "Sistema" },
  {
    label: "Templates de Role",
    href: "/admin/platform/role-templates",
    icon: "layout-template",
    group: "Sistema",
  },
];
