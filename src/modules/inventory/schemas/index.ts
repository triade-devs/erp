import { z } from "zod";

export const productSchema = z.object({
  sku: z
    .string()
    .min(1, "SKU obrigatório")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[A-Z0-9\-]+$/i, "SKU deve ser alfanumérico (letras, números e hífens)"),
  ncm: z
    .string()
    .min(1, "NCM obrigatório")
    .regex(/^[0-9]{4}\.[0-9]{2}\.[0-9]{2}$/, "NCM deve estar no formato XXXX.XX.XX"),
  barcode: z
    .string()
    .regex(/^[0-9]{8}$|^[0-9]{13}$/, "Use EAN-8 ou EAN-13")
    .optional()
    .or(z.literal("")),
  name: z.string().min(2, "Mínimo 2 caracteres").max(60, "Máximo 60 caracteres"),
  description: z.string().min(1, "Descrição obrigatória").max(100, "Máximo 100 caracteres"),
  unit: z.enum(["UN", "KG", "L", "CX", "M"], { required_error: "Selecione a unidade" }),
  costPrice: z.coerce.number({ invalid_type_error: "Valor inválido" }).nonnegative("Deve ser >= 0"),
  salePrice: z.coerce.number({ invalid_type_error: "Valor inválido" }).nonnegative("Deve ser >= 0"),
  minStock: z.coerce
    .number({ invalid_type_error: "Valor inválido" })
    .int("Use um inteiro")
    .nonnegative("Deve ser >= 0")
    .default(0),
  supplierId: z.string().uuid("Selecione um fornecedor"),
  classificationId: z.string().uuid().optional().or(z.literal("")),
  location: z.string().max(40, "Máximo 40 caracteres").optional().or(z.literal("")),
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
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  onlyActive: z.coerce.boolean().default(true),
  sortBy: z.enum(["name", "sku", "stock", "cost_price", "sale_price"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  classificationId: z.string().uuid().optional(),
});

export const listMovementsSchema = z.object({
  productId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["created_at", "quantity", "movement_type"]).default("created_at"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ProductInput = z.infer<typeof productSchema>;
export type MovementInput = z.infer<typeof movementSchema>;
export type ListProductsInput = z.infer<typeof listProductsSchema>;
export type ListMovementsInput = z.infer<typeof listMovementsSchema>;
