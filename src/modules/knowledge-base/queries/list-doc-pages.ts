import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { docPageFrontmatterSchema, type DocPageFrontmatter } from "../schemas/doc-page";

export type DocPage = {
  slug: string[];
  frontmatter: DocPageFrontmatter;
  filePath: string;
};

export function listDocPages(): DocPage[] {
  const docsDir = path.join(process.cwd(), "src", "content", "docs");

  if (!fs.existsSync(docsDir)) {
    return [];
  }

  const results: DocPage[] = [];

  function walkDir(dir: string, baseSegments: string[]) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walkDir(path.join(dir, entry.name), [...baseSegments, entry.name]);
      } else if (entry.name.endsWith(".mdx")) {
        const filePath = path.join(dir, entry.name);
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const { data } = matter(fileContent);
        const parsed = docPageFrontmatterSchema.safeParse(data);
        if (parsed.success) {
          results.push({
            slug: [...baseSegments, entry.name.replace(/\.mdx$/, "")],
            frontmatter: parsed.data,
            filePath,
          });
        }
      }
    }
  }

  walkDir(docsDir, []);
  return results;
}
