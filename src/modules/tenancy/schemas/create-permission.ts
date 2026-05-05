import { z } from "zod";

export const createPermissionSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9:_-]+$/, "Use somente letras minúsculas, números, :, _ e -"),
  resource: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
