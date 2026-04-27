// Barrel — única API pública do módulo knowledge-base
export { listArticles } from "./queries/list-articles";
export { getArticleBySlug } from "./queries/get-article-by-slug";
export { listCategories } from "./queries/list-categories";
export type {
  KbArticle,
  KbCategory,
  KbArticleStatus,
  KbAudience,
  ArticleWithCategory,
} from "./types";
