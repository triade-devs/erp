import { z } from "zod";

export const roleTemplateCreateSchema = z.object({
  code: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "Apenas minúsculas, números, _ e -"),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  sort_order: z.coerce.number().int().min(0).max(9999).default(100),
});

export const roleTemplateUpdateSchema = roleTemplateCreateSchema.omit({ code: true });

export type RoleTemplateCreateInput = z.infer<typeof roleTemplateCreateSchema>;
export type RoleTemplateUpdateInput = z.infer<typeof roleTemplateUpdateSchema>;
