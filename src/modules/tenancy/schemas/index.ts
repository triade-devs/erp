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
export { createModuleSchema } from "./create-module";
export type { CreateModuleInput } from "./create-module";
export { updateModuleSchema } from "./update-module";
export type { UpdateModuleInput } from "./update-module";
export { createPermissionSchema } from "./create-permission";
export type { CreatePermissionInput } from "./create-permission";
