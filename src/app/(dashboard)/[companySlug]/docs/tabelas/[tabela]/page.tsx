import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { DocRenderer, docPageFrontmatterSchema } from "@/modules/knowledge-base";

type Props = {
  params: Promise<{ companySlug: string; tabela: string }>;
};

export default async function TabelaPage({ params }: Props) {
  const { tabela } = await params;
  const filePath = path.join(process.cwd(), "src", "content", "docs", "tabelas", `${tabela}.mdx`);

  if (!fs.existsSync(filePath)) notFound();

  const raw = fs.readFileSync(filePath, "utf-8");
  const { content, data } = matter(raw);
  const parsed = docPageFrontmatterSchema.safeParse(data);
  const title = parsed.success ? parsed.data.title : tabela;

  return (
    <article>
      <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
      <DocRenderer source={content} />
    </article>
  );
}
