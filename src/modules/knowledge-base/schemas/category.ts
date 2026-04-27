import { z } from "zod";

export const categorySchema = z.object({
  title: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  slug: z
    .string()
    .min(1, "Slug obrigatório")
    .max(80, "Máximo 80 caracteres")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  parent_id: z.string().uuid("Categoria pai inválida").optional(),
  audience: z.enum(["user", "dev", "both"]).default("user"),
  position: z.number().default(0),
});

export type CategoryInput = z.infer<typeof categorySchema>;
