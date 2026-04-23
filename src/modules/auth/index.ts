// Barrel — única API pública do módulo auth
export { signInAction } from "./actions/sign-in";
export { signUpAction } from "./actions/sign-up";
export { signOutAction } from "./actions/sign-out";
export { recoverPasswordAction } from "./actions/recover-password";
export { signInGoogleAction } from "./actions/sign-in-google";

export { getCurrentUser } from "./queries/get-current-user";

export { SignInForm } from "./components/sign-in-form";
export { SignUpForm } from "./components/sign-up-form";
export { RecoverForm } from "./components/recover-form";
export { GoogleButton } from "./components/google-button";

export { canWriteProducts, isAdmin } from "./services/profile-service";

export type { SignInInput, SignUpInput, RecoverInput } from "./schemas";
export type { CompanyMembership } from "./queries/get-current-user";
