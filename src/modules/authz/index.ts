// Barrel — única API pública do módulo authz

export {
  getEffectivePermissions,
  hasPermission,
  requirePermission,
  ForbiddenError,
} from "./services/authz-service";
export { withPermission } from "./services/with-permission";
export type { ActionCtx } from "./services/with-permission";
export { PermissionsProvider, PermissionsContext } from "./components/permissions-provider";
export { Can } from "./components/can";
export { usePermissions } from "./hooks/use-permissions";
