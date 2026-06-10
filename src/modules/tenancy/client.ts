// Ponto de entrada para Client Components — exporta apenas Server Actions ("use server").
// Não re-exporta queries/services com server-only; use @/modules/tenancy para Server Components.
export { updateCompanySettingsAction } from "./actions/update-company-settings";
export { createInvitationAction } from "./actions/create-invitation";
export { revokeInvitationAction } from "./actions/revoke-invitation";
export { regenerateInvitationAction } from "./actions/regenerate-invitation";
export { acceptInvitationAction } from "./actions/accept-invitation";
export { updateMemberStatusAction } from "./actions/update-member-status";
export { updateMemberRolesAction } from "./actions/update-member-roles";
export { createRoleAction } from "./actions/create-role";
export { updateRoleAction } from "./actions/update-role";
export { deleteRoleAction } from "./actions/delete-role";
export { updateRolePermissionsAction } from "./actions/update-role-permissions";
export { updateRoleScopesAction } from "./actions/update-role-scopes";
export { switchActiveCompanyAction } from "./actions/switch-active-company";
export { toggleModuleAction } from "./actions/toggle-module";
export { transferMemberAction } from "./actions/transfer-member";
export { addMemberToCompanyAction } from "./actions/add-member-to-company";
export { searchUsersForCompanyAction } from "./actions/search-users-for-company";
export type { UserSearchResult } from "./actions/search-users-for-company";
export type { InvitationLookup } from "./queries/get-invitation-by-token-or-code";

// Templates (PR #D3)
export { createRoleTemplateAction } from "./actions/create-role-template";
export { updateRoleTemplateAction } from "./actions/update-role-template";
export { updateTemplatePermissionsAction } from "./actions/update-template-permissions";
export { deleteRoleTemplateAction } from "./actions/delete-role-template";
export { applyTemplateToCompaniesAction } from "./actions/apply-template-to-companies";
export { resetRoleFromTemplateAction } from "./actions/reset-role-from-template";
