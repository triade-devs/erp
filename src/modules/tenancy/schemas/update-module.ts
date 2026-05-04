import { z } from "zod";

export const updateModuleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(100),
});

export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
