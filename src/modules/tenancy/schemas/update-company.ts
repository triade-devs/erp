import { z } from "zod";

export const updateCompanySchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z.string().optional(),
  document: z.string().optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
