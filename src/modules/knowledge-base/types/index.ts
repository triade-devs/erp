import type { Database } from "@/types/database.types";

export type KbArticle = Database["public"]["Tables"]["kb_articles"]["Row"];
export type KbCategory = Database["public"]["Tables"]["kb_categories"]["Row"];

export type KbArticleStatus = "draft" | "published" | "archived";
export type KbAudience = "user" | "dev" | "both";

export type ArticleWithCategory = KbArticle & { category: KbCategory | null };
