// Ponto de entrada para Client Components — exporta apenas Server Actions e tipos simples.
export { createProductAction } from "./actions/create-product";
export { updateProductAction } from "./actions/update-product";
export { deactivateProductAction } from "./actions/deactivate-product";
export { reactivateProductAction } from "./actions/reactivate-product";
export { registerMovementAction } from "./actions/register-movement";
export { createWarehouseAction } from "./actions/create-warehouse";
export { updateWarehouseAction } from "./actions/update-warehouse";
export { toggleWarehouseActiveAction } from "./actions/toggle-warehouse-active";
export type { Warehouse } from "./types";
