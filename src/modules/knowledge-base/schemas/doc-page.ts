import { z } from "zod";

export const docPageFrontmatterSchema = z.object({
  title: z.string().min(1),
  audience: z.enum(["user", "dev", "both"]),
  related_module: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type DocPageFrontmatter = z.infer<typeof docPageFrontmatterSchema>;
