import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import { Callout } from "./callout";
import { TableSpec } from "./table-spec";
import { RlsBlock } from "./rls-block";
import { MermaidDiagram } from "./mermaid-diagram";

type Props = {
  source: string;
};

const components = {
  Callout,
  TableSpec,
  RlsBlock,
  MermaidDiagram,
};

export function DocRenderer({ source }: Props) {
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: "wrap" }],
            [rehypePrettyCode, { theme: "github-dark" }],
          ],
        },
      }}
    />
  );
}
