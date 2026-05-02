import { z } from "zod";

export const createModuleSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Somente letras minúsculas, números e hífens"),
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(100),
  is_system: z.boolean().default(false),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
