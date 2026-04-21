import type { Database } from "@/types/database.types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
export type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"];
export type StockMovementInsert = Database["public"]["Tables"]["stock_movements"]["Insert"];

export type MovementType = Database["public"]["Enums"]["movement_type"];

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
