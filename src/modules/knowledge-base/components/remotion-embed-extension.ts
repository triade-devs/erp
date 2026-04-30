import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    remotionEmbed: {
      insertRemotionEmbed: (options: {
        composition: string;
        props: Record<string, unknown>;
      }) => ReturnType;
    };
  }
}

export const RemotionEmbedExtension = Node.create({
  name: "remotionEmbed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      composition: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-composition"),
        renderHTML: ({ composition }: { composition: string }) => ({
          "data-composition": composition,
        }),
      },
      props: {
        default: "{}",
        parseHTML: (el) => el.getAttribute("data-props") ?? "{}",
        renderHTML: ({ props }: { props: string }) => ({
          "data-props": typeof props === "string" ? props : JSON.stringify(props),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-remotion-embed]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-remotion-embed": "" })];
  },

  addCommands() {
    return {
      insertRemotionEmbed:
        ({ composition, props }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { composition, props: JSON.stringify(props) },
          });
        },
    };
  },
});
