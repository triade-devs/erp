// Barrel — única API pública do módulo tenancy

// Actions
export { switchActiveCompanyAction } from "./actions/switch-active-company";
export { createCompanyAction } from "./actions/create-company";
export { updateCompanyAction } from "./actions/update-company";
export { toggleModuleAction } from "./actions/toggle-module";

// Queries
export { listMyCompanies } from "./queries/list-my-companies";
export { resolveCompany } from "./queries/resolve-company";
export { listAllCompanies } from "./queries/list-all-companies";
export { listModules } from "./queries/list-modules";
export { listCompanyModules } from "./queries/list-company-modules";
export { listCompanyMembers } from "./queries/list-company-members";

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
