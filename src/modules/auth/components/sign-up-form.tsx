"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signUpAction } from "../actions/sign-up";

const initial = { ok: false } as const;

type Props = {
  inviteToken?: string;
};

export function SignUpForm({ inviteToken }: Props) {
  const [state, formAction] = useActionState(signUpAction, initial);

  if (state.ok) {
    return (
      <Alert>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {inviteToken ? (
        <input type="hidden" name="inviteToken" value={inviteToken} />
      ) : (
        <div className="space-y-2">
          <Label htmlFor="inviteToken">Código ou link de convite *</Label>
          <Input
            id="inviteToken"
            name="inviteToken"
            required
            placeholder="Ex: INV-XXXX-XXXX ou cole o link completo"
          />
          {state.fieldErrors?.inviteToken && (
            <p className="text-sm text-red-600">{state.fieldErrors.inviteToken[0]}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo</Label>
        <Input id="fullName" name="fullName" required placeholder="João da Silva" />
        {state.fieldErrors?.fullName && (
          <p className="text-sm text-red-600">{state.fieldErrors.fullName[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required placeholder="••••••••" />
        {state.fieldErrors?.password && (
          <p className="text-sm text-red-600">{state.fieldErrors.password[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          placeholder="••••••••"
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="text-sm text-red-600">{state.fieldErrors.confirmPassword[0]}</p>
        )}
      </div>

      {state.message && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{state.message}</p>
      )}

      <SubmitButton />

      <p className="text-center text-sm text-muted-foreground">
        Já tenho conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Criando conta..." : "Criar conta"}
    </Button>
  );
}
