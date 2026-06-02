import { z } from "zod";

const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

export const supplierSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(80, "Máximo 80 caracteres"),
  document: z
    .string()
    .regex(cnpjRegex, "CNPJ inválido — use o formato 00.000.000/0001-00")
    .or(z.string().regex(cpfRegex, "CPF inválido — use o formato 000.000.000-00"))
    .or(z.literal(""))
    .optional()
    .nullable(),
  phone: z.string().max(20, "Máximo 20 caracteres").optional().nullable(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
