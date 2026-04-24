import { z } from "zod";

// Schema para trocar a empresa ativa
export const switchActiveCompanySchema = z.object({
  companyId: z.string().uuid("ID de empresa inválido"),
});

export type SwitchActiveCompanyInput = z.infer<typeof switchActiveCompanySchema>;

export { createRoleSchema } from "./create-role";
export type { CreateRoleInput } from "./create-role";
export { updateRoleSchema } from "./update-role";
export type { UpdateRoleInput } from "./update-role";
