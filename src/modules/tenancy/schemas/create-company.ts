import { z } from "zod";

export const createCompanySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z
    .string()
    .min(3, "Slug deve ter pelo menos 3 caracteres")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  plan: z.enum(["starter", "pro", "enterprise"], {
    errorMap: () => ({ message: "Plano inválido" }),
  }),
  document: z.string().optional(),
  modules: z.array(z.string().min(1)).min(1, "Selecione pelo menos um módulo"),
  ownerEmail: z.string().email("E-mail inválido").optional().or(z.literal("")),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
