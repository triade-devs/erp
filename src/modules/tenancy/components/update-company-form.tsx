"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCompanyAction } from "../actions/update-company";
import type { ActionResult } from "@/lib/errors";
import type { Tables } from "@/types/database.types";

type Company = Tables<"companies">;

const initial: ActionResult = { ok: false };

type Props = {
  company: Company;
};

export function UpdateCompanyForm({ company }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateCompanyAction, initial);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  useEffect(() => {
    if (state.ok) {
      router.push("/admin/companies");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
      {/* ID oculto */}
      <input type="hidden" name="id" value={company.id} />

      {!state.ok && state.message && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Nome */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Nome <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={company.name}
            aria-invalid={!!fieldErrors?.name}
          />
          {fieldErrors?.name && <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>}
        </div>

        {/* Slug (somente leitura) */}
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug_display" value={company.slug} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            O slug não pode ser alterado após a criação.
          </p>
        </div>

        {/* Plano */}
        <div className="space-y-2">
          <Label htmlFor="plan">
            Plano <span className="text-red-500">*</span>
          </Label>
          <Select name="plan" defaultValue={company.plan}>
            <SelectTrigger id="plan">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          {fieldErrors?.plan && <p className="text-sm text-red-600">{fieldErrors.plan[0]}</p>}
        </div>

        {/* Documento */}
        <div className="space-y-2">
          <Label htmlFor="document">CNPJ / CPF</Label>
          <Input
            id="document"
            name="document"
            placeholder="00.000.000/0001-00"
            defaultValue={company.document ?? ""}
          />
          {fieldErrors?.document && (
            <p className="text-sm text-red-600">{fieldErrors.document[0]}</p>
          )}
        </div>

        {/* Status ativo */}
        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              defaultChecked={company.is_active}
              className="h-4 w-4"
            />
            <Label htmlFor="is_active">Empresa ativa</Label>
          </div>
          {fieldErrors?.is_active && (
            <p className="text-sm text-red-600">{fieldErrors.is_active[0]}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancelar
        </Button>
        <SubmitButton />
      </div>
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
