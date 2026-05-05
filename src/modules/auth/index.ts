// Barrel — única API pública do módulo auth
export { signInAction } from "./actions/sign-in";
export { signUpAction } from "./actions/sign-up";
export { signOutAction } from "./actions/sign-out";
export { recoverPasswordAction } from "./actions/recover-password";
export { resetPasswordAction } from "./actions/reset-password";
export { signInGoogleAction } from "./actions/sign-in-google";
export { approveResetRequestAction } from "./actions/approve-reset-request";
export { initiateResetForUserAction } from "./actions/initiate-reset-for-user";
export { revokeResetRequestAction } from "./actions/revoke-reset-request";

export { getCurrentUser } from "./queries/get-current-user";
export { listResetRequestsForCompany } from "./queries/list-reset-requests-for-company";
export type { ResetRequestRow } from "./queries/list-reset-requests-for-company";

export { SignInForm } from "./components/sign-in-form";
export { SignUpForm } from "./components/sign-up-form";
export { RecoverForm } from "./components/recover-form";
export { ResetPasswordForm } from "./components/reset-password-form";
export { GoogleButton } from "./components/google-button";

export type { SignInInput, SignUpInput, RecoverInput, ResetPasswordInput } from "./schemas";
export type { CompanyMembership } from "./queries/get-current-user";
