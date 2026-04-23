import { z } from "zod";

export const updateCompanySchema = z.object({
  id: z.string().uuid("ID de empresa inválido"),
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  plan: z.enum(["starter", "pro", "enterprise"], {
    errorMap: () => ({ message: "Plano inválido" }),
  }),
  document: z.string().optional(),
  is_active: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
