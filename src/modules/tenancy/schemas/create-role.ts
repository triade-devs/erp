import { z } from "zod";

export const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(200).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
