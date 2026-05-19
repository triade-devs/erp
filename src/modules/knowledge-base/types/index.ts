import type { Database, Json } from "@/types/database.types";

export type KbArticle = Database["public"]["Tables"]["kb_articles"]["Row"];
export type KbArticleInsert = Database["public"]["Tables"]["kb_articles"]["Insert"];
export type KbArticleUpdate = Database["public"]["Tables"]["kb_articles"]["Update"];
export type KbArticleContent = { [key: string]: Json | undefined };
export type KbCategory = Database["public"]["Tables"]["kb_categories"]["Row"];

export type KbArticleStatus = "draft" | "published" | "archived";
export type KbAudience = "user" | "dev" | "both";

export type ArticleWithCategory = KbArticle & { category: KbCategory | null };
