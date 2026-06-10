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
export { listFieldCatalog } from "./queries/list-field-catalog";
export type { FieldCatalogEntry, FieldCatalogByModule } from "./queries/list-field-catalog";
export { listRoleFieldRules } from "./queries/list-role-field-rules";
export type {
  FieldMode,
  RoleFieldRuleRow,
  RoleFieldRulesByKey,
} from "./queries/list-role-field-rules";
export { getUserFieldModes } from "./queries/get-user-field-modes";
export type { UserFieldModes } from "./queries/get-user-field-modes";
export type { FieldModesMap } from "./components/permissions-provider";
export { updateRoleFieldRulesAction } from "./actions/update-role-field-rules";
export type { FieldRuleInput } from "./actions/update-role-field-rules";
export { listVisibleColumns } from "./services/field-rules";
