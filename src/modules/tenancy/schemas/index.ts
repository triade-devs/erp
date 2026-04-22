import { z } from "zod";

// Schema para trocar a empresa ativa
export const switchActiveCompanySchema = z.object({
  companyId: z.string().uuid("ID de empresa inválido"),
});

export type SwitchActiveCompanyInput = z.infer<typeof switchActiveCompanySchema>;
