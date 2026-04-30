import { z } from "zod";

export const productSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU obrigatório")
    .max(32, "Máximo 32 caracteres")
    .regex(/^[A-Z0-9\-]+$/i, "SKU deve ser alfanumérico (letras, números e hífens)"),
  name: z.string().min(2, "Mínimo 2 caracteres").max(120, "Máximo 120 caracteres"),
  description: z.string().max(2000, "Máximo 2000 caracteres").optional().nullable(),
  unit: z.enum(["UN", "KG", "L", "CX", "M"], { required_error: "Selecione a unidade" }),
  costPrice: z.coerce.number({ invalid_type_error: "Valor inválido" }).nonnegative("Deve ser >= 0"),
  salePrice: z.coerce.number({ invalid_type_error: "Valor inválido" }).nonnegative("Deve ser >= 0"),
  minStock: z.coerce
    .number({ invalid_type_error: "Valor inválido" })
    .nonnegative("Deve ser >= 0")
    .default(0),
  isActive: z.coerce.boolean().default(true),
});

export const movementSchema = z.object({
  productId: z.string().uuid("Produto inválido"),
  type: z.enum(["in", "out", "adjustment"], { required_error: "Selecione o tipo" }),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantidade inválida" })
    .positive("Deve ser maior que zero"),
  unitCost: z.coerce.number().nonnegative().optional(),
  reason: z.string().max(500, "Máximo 500 caracteres").optional(),
});

export const listProductsSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(9999).default(20),
  onlyActive: z.coerce.boolean().default(true),
});

export const listMovementsSchema = z.object({
  productId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ProductInput = z.infer<typeof productSchema>;
export type MovementInput = z.infer<typeof movementSchema>;
export type ListProductsInput = z.infer<typeof listProductsSchema>;
export type ListMovementsInput = z.infer<typeof listMovementsSchema>;
