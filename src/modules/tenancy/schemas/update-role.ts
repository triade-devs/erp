import { z } from "zod";

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
  parent_role_id: z.string().uuid().optional().nullable(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
