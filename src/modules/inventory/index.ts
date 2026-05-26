// Barrel — única API pública do módulo inventory
export { createProductAction } from "./actions/create-product";
export { updateProductAction } from "./actions/update-product";
export { deactivateProductAction } from "./actions/deactivate-product";
export { reactivateProductAction } from "./actions/reactivate-product";
export { registerMovementAction } from "./actions/register-movement";
export { createWarehouseAction } from "./actions/create-warehouse";
export { updateWarehouseAction } from "./actions/update-warehouse";
export { toggleWarehouseActiveAction } from "./actions/toggle-warehouse-active";

export { listProducts } from "./queries/list-products";
export { getProduct } from "./queries/get-product";
export { listMovements } from "./queries/list-movements";
export { getInventoryStats } from "./queries/get-inventory-stats";
export { listWarehouses, type Warehouse } from "./queries/list-warehouses";
export type { InventoryStats } from "./queries/get-inventory-stats";

export {
  warehouseCreateSchema,
  warehouseUpdateSchema,
  type WarehouseCreateInput,
  type WarehouseUpdateInput,
} from "./schemas/warehouse";

export { ProductTable } from "./components/product-table";
export { ProductForm } from "./components/product-form";
export { MovementForm } from "./components/movement-form";
export { MovementTable } from "./components/movement-table";

export {
  validateMovement,
  calculateNewStock,
  InsufficientStockError,
} from "./services/stock-service";

export type {
  Product,
  ProductInsert,
  ProductUpdate,
  StockMovement,
  StockMovementInsert,
  MovementWithProduct,
  MovementType,
  PaginatedResult,
} from "./types";
