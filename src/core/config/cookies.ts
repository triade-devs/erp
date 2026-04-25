/**
 * Nomes dos cookies da aplicação.
 *
 * Este arquivo pode ser importado em qualquer contexto (Edge Runtime, Server, Client)
 * pois não possui dependências de runtime específico.
 */

/** Cookie com o UUID da empresa ativa do usuário. */
export const ACTIVE_COMPANY_COOKIE = "erp.active_company";

/** Cookie com o slug da empresa ativa do usuário (usado no middleware para redirecionamentos). */
export const ACTIVE_COMPANY_SLUG_COOKIE = "erp.active_company_slug";
