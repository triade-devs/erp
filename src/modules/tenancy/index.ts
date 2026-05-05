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

// Services
export { getActiveCompanyId } from "./services/active-company";

// Components
export { CompanySwitcher } from "./components/company-switcher";
export { CompanyBadge } from "./components/company-badge";
export { CreateCompanyForm } from "./components/create-company-form";
export { UpdateCompanyForm } from "./components/update-company-form";
export { ModuleToggleList } from "./components/module-toggle-list";

// Types
export type { Company } from "./queries/list-my-companies";
export type { Module } from "./queries/list-modules";
export type { CompanyModuleStatus } from "./queries/list-company-modules";
export type { CompanyMember } from "./queries/list-company-members";
export type { CompanyRole } from "./queries/list-company-roles";
