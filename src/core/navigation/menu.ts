export type MenuItem = {
  label: string;
  href: string;
  icon?: string;
  roles?: string[];
  requiresModule?: string;
  requiresPermission?: string;
};

/**
 * Registro central do menu de navegação.
 * Novos módulos se registram aqui sem alterar o layout.
 */
export const MODULES_MENU: MenuItem[] = [
  { label: "Início", href: "/" },
  { label: "Estoque", href: "/inventory" },
  { label: "Movimentações", href: "/inventory/movements" },
  // Novos módulos: Orçamentos, Clientes, Financeiro, etc.
];
