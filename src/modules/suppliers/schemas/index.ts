import { z } from "zod";

const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;

export const supplierSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres").max(60, "Máximo 60 caracteres"),
  country: z.string().max(60).optional().nullable(),
  state: z.string().max(60, "Máximo 60 caracteres").optional().nullable(),
  city: z.string().max(60, "Máximo 60 caracteres").optional().nullable(),
  // documento só é validado quando Brasil
  document: z
    .string()
    .regex(cnpjRegex, "CNPJ inválido — use o formato 00.000.000/0001-00")
    .or(z.string().regex(cpfRegex, "CPF inválido — use o formato 000.000.000-00"))
    .or(z.literal(""))
    .optional()
    .nullable(),
  phone: z.string().max(30, "Máximo 30 caracteres").optional().nullable(),
  email: z
    .string()
    .email("E-mail inválido")
    .max(50, "Máximo 50 caracteres")
    .optional()
    .or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
