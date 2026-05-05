// Barrel — única API pública do módulo tenancy

// Actions
export { switchActiveCompanyAction } from "./actions/switch-active-company";
export { createCompanyAction } from "./actions/create-company";
export { updateCompanyAction } from "./actions/update-company";
export { toggleModuleAction } from "./actions/toggle-module";
export { createInvitationAction } from "./actions/create-invitation";
export { revokeInvitationAction } from "./actions/revoke-invitation";
export { regenerateInvitationAction } from "./actions/regenerate-invitation";
export { acceptInvitationAction } from "./actions/accept-invitation";
export { updateMemberStatusAction } from "./actions/update-member-status";
export { updateMemberRolesAction } from "./actions/update-member-roles";
export { updateCompanySettingsAction } from "./actions/update-company-settings";
export { createRoleAction } from "./actions/create-role";
export { updateRoleAction } from "./actions/update-role";
export { deleteRoleAction } from "./actions/delete-role";
export { transferMemberAction } from "./actions/transfer-member";
export { updateRolePermissionsAction } from "./actions/update-role-permissions";
export { createModuleAction } from "./actions/create-module";
export { updateModuleAction } from "./actions/update-module";
export { toggleModuleActiveAction } from "./actions/toggle-module-active";
export { bulkToggleModuleForCompaniesAction } from "./actions/bulk-toggle-module-for-companies";
export { createPermissionAction } from "./actions/create-permission";
export { deletePermissionAction } from "./actions/delete-permission";
export { deleteModuleAction } from "./actions/delete-module";
export { updateSystemRolePermissionsAction } from "./actions/update-system-role-permissions";

// Queries
export { getActiveCompanySlug } from "./queries/get-active-company-slug";
export { listMyCompanies } from "./queries/list-my-companies";
export { resolveCompany } from "./queries/resolve-company";
export { listAllCompanies } from "./queries/list-all-companies";
export { listModules } from "./queries/list-modules";
export { listCompanyModules } from "./queries/list-company-modules";
export { listCompanyMembers } from "./queries/list-company-members";
export { listCompanyRoles } from "./queries/list-company-roles";
export { listRolePermissionMatrix } from "./queries/list-role-permission-matrix";
export type { ModulePermissions, PermissionRow } from "./queries/list-role-permission-matrix";
export { searchUsersForCompanyAction } from "./actions/search-users-for-company";
export type { UserSearchResult, SearchUsersResult } from "./actions/search-users-for-company";
export { listPendingInvitations } from "./queries/list-pending-invitations";
export type { PendingInvitation } from "./queries/list-pending-invitations";
export { getInvitationByTokenOrCode } from "./queries/get-invitation-by-token-or-code";
export type { InvitationLookup } from "./queries/get-invitation-by-token-or-code";
export { listModulesWithStats } from "./queries/list-modules-with-stats";
export type { ModuleWithStats } from "./queries/list-modules-with-stats";
export { getModuleWithPermissions } from "./queries/get-module-with-permissions";
export type {
  ModuleWithPermissions,
  ModulePermission,
} from "./queries/get-module-with-permissions";
export { listAllRoles } from "./queries/list-all-roles";
export type { RoleWithCompany } from "./queries/list-all-roles";
export { getSystemRolePermissions } from "./queries/get-system-role-permissions";
export type { SystemRoleMatrix, SystemRolePermission } from "./queries/get-system-role-permissions";

// Services
export { getActiveCompanyId } from "./services/active-company";

// Components
export { CompanySwitcher } from "./components/company-switcher";
export { CompanyBadge } from "./components/company-badge";
export { CreateCompanyForm } from "./components/create-company-form";
export { UpdateCompanyForm } from "./components/update-company-form";
export { ModuleToggleList } from "./components/module-toggle-list";
export { AdminModulesTable } from "./components/admin-modules-table";
export { CreateModuleForm } from "./components/create-module-form";
export { EditModuleForm } from "./components/edit-module-form";
export { ModulePermissionsTable } from "./components/module-permissions-table";
export { DeleteModuleButton } from "./components/delete-module-button";
export { AdminSystemRolesTab } from "./components/admin-system-roles-tab";
export { AdminAllRolesTab } from "./components/admin-all-roles-tab";

// Types
export type { Company } from "./queries/list-my-companies";
export type { Module } from "./queries/list-modules";
export type { CompanyModuleStatus } from "./queries/list-company-modules";
export type { CompanyMember } from "./queries/list-company-members";
export type { CompanyRole } from "./queries/list-company-roles";
