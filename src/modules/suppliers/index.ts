// Barrel — única API pública do módulo suppliers
// IMPORTANTE: queries usam server-only — não importe este barrel em Client Components.
// Em Client Components, use apenas as actions e componentes via prop drilling ou Context.

// Actions
export { createSupplierAction } from "./actions/create-supplier";
export { updateSupplierAction } from "./actions/update-supplier";
export { deactivateSupplierAction } from "./actions/deactivate-supplier";

// Queries (server-only — use apenas em Server Components)
export { listSuppliers } from "./queries/list-suppliers";
export { getSupplier } from "./queries/get-supplier";

// Types
export type { Supplier, SupplierInsert, SupplierUpdate } from "./types";

// Schemas
export { supplierSchema, type SupplierInput } from "./schemas";

// Components
export { SupplierForm } from "./components/supplier-form";
export { SupplierTable } from "./components/supplier-table";
export { SupplierQuickModal } from "./components/supplier-quick-modal";
