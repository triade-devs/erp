// Ponto de entrada para Client Components — exporta apenas Server Actions ("use server").
// Não re-exporta queries/services com server-only; use @/modules/tenancy para Server Components.
export { updateCompanySettingsAction } from "./actions/update-company-settings";
export { inviteMemberAction } from "./actions/invite-member";
export { updateMemberStatusAction } from "./actions/update-member-status";
export { updateMemberRolesAction } from "./actions/update-member-roles";
export { createRoleAction } from "./actions/create-role";
export { updateRoleAction } from "./actions/update-role";
export { deleteRoleAction } from "./actions/delete-role";
export { updateRolePermissionsAction } from "./actions/update-role-permissions";
export { switchActiveCompanyAction } from "./actions/switch-active-company";
export { toggleModuleAction } from "./actions/toggle-module";
export { transferMemberAction } from "./actions/transfer-member";
export { addMemberToCompanyAction } from "./actions/add-member-to-company";
export { searchUsersForCompanyAction } from "./actions/search-users-for-company";
export type { UserSearchResult } from "./actions/search-users-for-company";
