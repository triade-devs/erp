import { z } from "zod";
import type { Json } from "@/types/database.types";
import type { KbArticleContent } from "../types";

function isJsonValue(value: unknown): value is Json {
  if (value === null) return true;
  if (["string", "number", "boolean"].includes(typeof value)) return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

function isKbArticleContent(value: unknown): value is KbArticleContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(isJsonValue);
}

export const createArticleSchema = z.object({
  title: z.string().min(2, "Mínimo 2 caracteres").max(200, "Máximo 200 caracteres"),
  summary: z.string().max(500, "Máximo 500 caracteres").optional(),
  content_md: z.string().min(1, "Conteúdo obrigatório"),
  content_json: z.custom<KbArticleContent>(isKbArticleContent, "JSON de conteúdo inválido"),
  category_id: z.string().uuid("Categoria inválida").optional(),
  audience: z.enum(["user", "dev", "both"]).default("user"),
  related_module: z.string().optional(),
  related_table: z.string().optional(),
});

export const updateArticleSchema = createArticleSchema.partial();

export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
