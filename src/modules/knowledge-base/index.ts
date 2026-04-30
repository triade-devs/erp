// Barrel — única API pública do módulo knowledge-base

// Actions
export { createArticleAction } from "./actions/create-article";
export { updateArticleAction } from "./actions/update-article";
export { deleteArticleAction } from "./actions/delete-article";
export { publishArticleAction } from "./actions/publish-article";

// Queries
export { listArticles } from "./queries/list-articles";
export { getArticleBySlug } from "./queries/get-article-by-slug";
export { listCategories } from "./queries/list-categories";

// Types
export type {
  KbArticle,
  KbCategory,
  KbArticleStatus,
  KbAudience,
  ArticleWithCategory,
} from "./types";

// Components
export { ArticleList } from "./components/article-list";
export { ArticleViewer } from "./components/article-viewer";
export { ArticleEditor } from "./components/article-editor";
export { CategoryTree } from "./components/category-tree";
export { PublishForm } from "./components/publish-form";

// Remotion
export { RemotionPlayer } from "./components/remotion-player";
export { RemotionEmbedExtension } from "./components/remotion-embed-extension";

// Schemas
export { createArticleSchema, updateArticleSchema } from "./schemas/article";
export { categorySchema } from "./schemas/category";
