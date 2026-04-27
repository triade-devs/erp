"use client";

import { useActionState } from "react";
import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownStorage } from "tiptap-markdown";
import type { Content } from "@tiptap/core";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createArticleAction } from "../actions/create-article";
import { updateArticleAction } from "../actions/update-article";
import type { ActionResult } from "@/lib/errors";
import type { ArticleWithCategory, KbCategory } from "../types";

type Props = {
  companySlug: string;
  article?: ArticleWithCategory | null;
  categories: KbCategory[];
};

const initial: ActionResult = { ok: false };

function getMarkdownFromEditor(ed: Editor): string {
  const storage = ed.storage as unknown as Record<string, unknown>;
  const md = storage["markdown"] as MarkdownStorage | undefined;
  return md?.getMarkdown() ?? "";
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

export function ArticleEditor({ companySlug: _companySlug, article, categories }: Props) {
  const isEdit = !!article;
  const action = isEdit ? updateArticleAction : createArticleAction;

  const [state, formAction] = useActionState(action, initial);

  const contentJsonRef = useRef<HTMLInputElement>(null);
  const contentMdRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: (article?.content_json ?? "") as Content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert min-h-[200px] max-w-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      },
    },
    onUpdate({ editor: ed }) {
      if (contentJsonRef.current) {
        contentJsonRef.current.value = JSON.stringify(ed.getJSON());
      }
      if (contentMdRef.current) {
        contentMdRef.current.value = getMarkdownFromEditor(ed);
      }
    },
  });

  // Show toast on state change
  useEffect(() => {
    if (state.message) {
      if (state.ok) {
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  function handleSubmit(formData: FormData) {
    // Sync hidden inputs from editor before submit
    if (editor) {
      formData.set("content_json", JSON.stringify(editor.getJSON()));
      formData.set("content_md", getMarkdownFromEditor(editor));
    }
    formAction(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      {!state.ok && state.message && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </div>
      )}
      {state.ok && state.message && (
        <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700">
          {state.message}
        </div>
      )}

      {isEdit && <input type="hidden" name="id" value={article.id} />}

      <input
        ref={contentJsonRef}
        type="hidden"
        name="content_json"
        defaultValue={article?.content_json ? JSON.stringify(article.content_json) : ""}
      />
      <input
        ref={contentMdRef}
        type="hidden"
        name="content_md"
        defaultValue={article?.content_md ?? ""}
      />

      {/* Título */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Título <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={article?.title ?? ""}
          aria-invalid={!!fieldErrors?.title}
        />
        {fieldErrors?.title && <p className="text-sm text-red-600">{fieldErrors.title[0]}</p>}
      </div>

      {/* Resumo */}
      <div className="space-y-1.5">
        <Label htmlFor="summary">Resumo</Label>
        <Textarea
          id="summary"
          name="summary"
          rows={3}
          defaultValue={article?.summary ?? ""}
          aria-invalid={!!fieldErrors?.summary}
        />
        {fieldErrors?.summary && <p className="text-sm text-red-600">{fieldErrors.summary[0]}</p>}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <Label htmlFor="category_id">Categoria</Label>
        <select
          id="category_id"
          name="category_id"
          defaultValue={article?.category_id ?? ""}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">— Nenhuma —</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.title}
            </option>
          ))}
        </select>
        {fieldErrors?.category_id && (
          <p className="text-sm text-red-600">{fieldErrors.category_id[0]}</p>
        )}
      </div>

      {/* Audiência */}
      <div className="space-y-1.5">
        <Label htmlFor="audience">Audiência</Label>
        <select
          id="audience"
          name="audience"
          defaultValue={article?.audience ?? "user"}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="user">Usuário final</option>
          <option value="dev">Desenvolvedor</option>
          <option value="both">Ambos</option>
        </select>
      </div>

      {/* Editor de conteúdo */}
      <div className="space-y-1.5">
        <Label>
          Conteúdo <span className="text-red-500">*</span>
        </Label>
        <EditorContent editor={editor} />
        {fieldErrors?.content_md && (
          <p className="text-sm text-red-600">{fieldErrors.content_md[0]}</p>
        )}
        {fieldErrors?.content_json && (
          <p className="text-sm text-red-600">{fieldErrors.content_json[0]}</p>
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
