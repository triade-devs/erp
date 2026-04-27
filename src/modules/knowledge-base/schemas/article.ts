import { z } from "zod";

export const createArticleSchema = z.object({
  title: z.string().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  summary: z.string().max(500, "Máximo 500 caracteres").optional(),
  content_md: z.string().min(1, "Conteúdo obrigatório"),
  content_json: z.record(z.unknown()),
  category_id: z.string().uuid("Categoria inválida").optional(),
  audience: z.enum(["user", "dev", "both"]).default("user"),
  related_module: z.string().optional(),
  related_table: z.string().optional(),
});

export const updateArticleSchema = createArticleSchema.partial();

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
