"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { publishArticleAction } from "../actions/publish-article";
import type { ActionResult } from "@/lib/errors";

type Props = {
  articleId: string;
  isPublished: boolean;
};

const initial: ActionResult = { ok: false };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending}>
      {pending ? "Aguarde..." : label}
    </Button>
  );
}

export function PublishForm({ articleId, isPublished }: Props) {
  const [state, formAction] = useActionState(publishArticleAction, initial);

  useEffect(() => {
    if (state.message) {
      if (state.ok) {
        toast.success(state.message);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  const action = isPublished ? "unpublish" : "publish";
  const label = isPublished ? "Despublicar" : "Publicar";

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={articleId} />
      <input type="hidden" name="action" value={action} />
      <SubmitButton label={label} />
    </form>
  );
}
