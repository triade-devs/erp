// Ponto de entrada para Client Components — exporta apenas hooks/componentes client-safe.
// Não re-exporta services com server-only; use @/modules/authz para Server Components.
export { Can } from "./components/can";
export { usePermissions } from "./hooks/use-permissions";
export { PermissionsProvider, PermissionsContext } from "./components/permissions-provider";
