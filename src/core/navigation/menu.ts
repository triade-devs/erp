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

/**
 * Registro central do menu de navegação.
 * Novos módulos se registram aqui sem alterar o layout.
 */
export const MODULES_MENU: MenuItem[] = [
  { label: "Início", href: "/" },
  { label: "Estoque", href: "/inventory", requiresSlug: true },
  { label: "Movimentações", href: "/inventory/movements", requiresSlug: true },
  // Novos módulos: Orçamentos, Clientes, Financeiro, etc.
];
