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
import { createCompanyAction } from "../actions/create-company";
import type { Module } from "../queries/list-modules";
import type { ActionResult } from "@/lib/errors";

const initial: ActionResult = { ok: false };

type Props = {
  modules: Module[];
};

export function CreateCompanyForm({ modules }: Props) {
  const router = useRouter();
  const [state, formAction] = useActionState(createCompanyAction, initial);
  const fieldErrors = state.ok ? undefined : state.fieldErrors;

  useEffect(() => {
    if (state.ok) {
      router.push("/admin/companies");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-6">
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
            placeholder="Acme Ltda"
            aria-invalid={!!fieldErrors?.name}
          />
          {fieldErrors?.name && <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>}
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">
            Slug <span className="text-red-500">*</span>
          </Label>
          <Input
            id="slug"
            name="slug"
            required
            placeholder="acme"
            pattern="[a-z0-9-]+"
            title="Apenas letras minúsculas, números e hífens"
            aria-invalid={!!fieldErrors?.slug}
          />
          {fieldErrors?.slug && <p className="text-sm text-red-600">{fieldErrors.slug[0]}</p>}
        </div>

        {/* Plano */}
        <div className="space-y-2">
          <Label htmlFor="plan">
            Plano <span className="text-red-500">*</span>
          </Label>
          <Select name="plan" defaultValue="starter">
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
          <Input id="document" name="document" placeholder="00.000.000/0001-00" />
          {fieldErrors?.document && (
            <p className="text-sm text-red-600">{fieldErrors.document[0]}</p>
          )}
        </div>

        {/* E-mail do owner */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="ownerEmail">E-mail do responsável (opcional)</Label>
          <Input
            id="ownerEmail"
            name="ownerEmail"
            type="email"
            placeholder="responsavel@empresa.com"
            aria-invalid={!!fieldErrors?.ownerEmail}
          />
          {fieldErrors?.ownerEmail && (
            <p className="text-sm text-red-600">{fieldErrors.ownerEmail[0]}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Um convite será enviado por e-mail se a chave de serviço estiver configurada.
          </p>
        </div>
      </div>

      {/* Módulos */}
      <div className="space-y-3">
        <div>
          <Label>
            Módulos habilitados <span className="text-red-500">*</span>
          </Label>
          {fieldErrors?.modules && (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.modules[0]}</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {modules.map((mod) => (
            <label
              key={mod.code}
              className="flex cursor-pointer items-center gap-2 rounded-md border p-3 hover:bg-accent"
            >
              <input type="checkbox" name="modules" value={mod.code} className="h-4 w-4" />
              <span className="text-sm font-medium">{mod.name}</span>
            </label>
          ))}
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
      {pending ? "Criando..." : "Criar empresa"}
    </Button>
  );
}
