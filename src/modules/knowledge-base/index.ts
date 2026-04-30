// Barrel — única API pública do módulo knowledge-base

// Actions
export { createArticleAction } from "./actions/create-article";
export { updateArticleAction } from "./actions/update-article";
export { deleteArticleAction } from "./actions/delete-article";
export { publishArticleAction } from "./actions/publish-article";
export { upsertCategoryAction } from "./actions/upsert-category";

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
export { DocRenderer } from "./components/doc-renderer";
export { Callout } from "./components/callout";
export { TableSpec } from "./components/table-spec";
export { RlsBlock } from "./components/rls-block";
export { MermaidDiagram } from "./components/mermaid-diagram";

// Schemas
export { createArticleSchema, updateArticleSchema } from "./schemas/article";
export { categorySchema } from "./schemas/category";
export { docPageFrontmatterSchema } from "./schemas/doc-page";
export type { DocPageFrontmatter } from "./schemas/doc-page";

// Doc pages (MDX)
export { listDocPages } from "./queries/list-doc-pages";
export type { DocPage } from "./queries/list-doc-pages";
