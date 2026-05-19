---
name: erp-form-components
description: Use when creating form components that submit to Server Actions in the triade-devs/erp project.
---

# ERP Form Components

## Overview

Dashboard forms use `useActionState` + `useFormStatus` + `sonner` toast. Auth forms use inline messages only. Never mix the two patterns.

## Dashboard Form Skeleton

```tsx
"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/errors";
import { myAction } from "../actions/my-action";

const initialState: ActionResult = { ok: false };

export function MyForm() {
  const [state, formAction] = useActionState(myAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const hasMountedRef = useRef(false); // prevents toast on initial render
  const fieldErrors = !state.ok && "fieldErrors" in state ? state.fieldErrors : undefined;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (state.ok) {
      formRef.current?.reset(); // clear fields on success
      toast.success(state.message ?? "Salvo com sucesso.");
    } else if (state.message) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">
          Título <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          required
          aria-invalid={!!fieldErrors?.title} // accessibility
        />
        {fieldErrors?.title && <p className="text-sm text-red-600">{fieldErrors.title[0]}</p>}
      </div>

      <SubmitButton />
    </form>
  );
}

// SubmitButton MUST be a separate component to access useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}
```

## Auth Form Skeleton (no toast)

Auth forms (`/login`, `/register`, `/recover`) use **inline messages only** — no toast, no reset.

```tsx
export function SignInForm() {
  const [state, formAction] = useActionState(signInAction, { ok: false });
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  return (
    <form action={formAction} className="space-y-4">
      {/* fields... */}
      {state.message && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.message}</p>
      )}
      <SubmitButton />
    </form>
  );
}
```

## Checklist — Dashboard Forms

- [ ] `"use client"` at top
- [ ] `useActionState(action, { ok: false })` — not `useState` + manual fetch
- [ ] `hasMountedRef` guard to prevent toast on initial render
- [ ] `formRef.current?.reset()` on success
- [ ] `toast.success` / `toast.error` from `sonner`
- [ ] `SubmitButton` as **separate component** (required to use `useFormStatus`)
- [ ] `aria-invalid={!!fieldErrors?.field}` on each input
- [ ] Field errors: `{fieldErrors?.field && <p className="text-sm text-red-600">{fieldErrors.field[0]}</p>}`

## Red Flags

| You're thinking...                                        | Reality                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `useTransition` + `startTransition` for the submit button | Use `useFormStatus` inside a separate `SubmitButton` component. Simpler and correct for forms.          |
| `toast` in an auth form                                   | Auth forms use inline messages. `toast` is for dashboard forms only.                                    |
| `SubmitButton` inline in the same component               | `useFormStatus` only works inside a component that is a child of the `<form>`. Extract it.              |
| Skipping `hasMountedRef`                                  | Initial `state = { ok: false }` will trigger `toast.error` on mount. Always guard with `hasMountedRef`. |
| Not resetting form on success                             | Users expect a clean form after submit. Add `formRef.current?.reset()`.                                 |
