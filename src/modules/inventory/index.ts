// Barrel — única API pública do módulo inventory
export { createProductAction } from "./actions/create-product";
export { updateProductAction } from "./actions/update-product";
export { deleteProductAction } from "./actions/delete-product";
export { reactivateProductAction } from "./actions/reactivate-product";
export { registerMovementAction } from "./actions/register-movement";

export { listProducts } from "./queries/list-products";
export { getProduct } from "./queries/get-product";
export { listMovements } from "./queries/list-movements";

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
