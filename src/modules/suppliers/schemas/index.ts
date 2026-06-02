import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  document: z.string().max(18, "Documento inválido").optional().nullable(),
  phone: z.string().max(20, "Máximo 20 caracteres").optional().nullable(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
