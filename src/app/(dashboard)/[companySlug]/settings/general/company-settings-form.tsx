"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanySettingsAction } from "@/modules/tenancy/client";
import type { ActionResult } from "@/lib/errors";
import type { Tables } from "@/types/database.types";

type Company = Tables<"companies">;

const initial: ActionResult = { ok: false };

export function CompanySettingsForm({
  company,
  readOnly,
}: {
  company: Company;
  readOnly: boolean;
}) {
  const boundAction = updateCompanySettingsAction.bind(null, company.id);
  const [state, formAction] = useActionState(boundAction, initial);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  return (
    <form action={formAction} className="space-y-6">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">
            Nome <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            disabled={readOnly}
            defaultValue={company.name}
            aria-invalid={!!fieldErrors?.name}
          />
          {fieldErrors?.name && <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={company.slug} disabled readOnly />
          <p className="text-xs text-muted-foreground">O slug não pode ser alterado.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="plan">Plano</Label>
          <Input id="plan" value={company.plan} disabled readOnly />
          <p className="text-xs text-muted-foreground">O plano é gerenciado pela plataforma.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="document">CNPJ / CPF</Label>
          <Input
            id="document"
            name="document"
            placeholder="00.000.000/0001-00"
            disabled={readOnly}
            defaultValue={company.document ?? ""}
          />
          {fieldErrors?.document && (
            <p className="text-sm text-red-600">{fieldErrors.document[0]}</p>
          )}
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <SubmitButton />
        </div>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar alterações"}
    </Button>
  );
}
