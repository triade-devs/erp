import { z } from "zod";

export const warehouseCreateSchema = z.object({
  name: z.string().min(2).max(100),
});

export const warehouseUpdateSchema = warehouseCreateSchema;

export type WarehouseCreateInput = z.infer<typeof warehouseCreateSchema>;
export type WarehouseUpdateInput = z.infer<typeof warehouseUpdateSchema>;
