export { listMdxDocs, type MdxDoc } from "../sources/content-docs.js";
/**
 * Re-export por simetria semântica: do ponto de vista da skill,
 * MDX é tanto fonte (quando escrita por dev) quanto alvo (quando
 * regenerada pela skill). Mantemos um ponto único de leitura.
 */
