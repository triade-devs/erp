"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInvitationAction } from "@/modules/tenancy/client";
import { signOutAction } from "@/modules/auth/client";
import type { InvitationLookup } from "@/modules/tenancy/client";

type Props = {
  token?: string;
  invite: InvitationLookup | null;
  isAuthenticated: boolean;
  userEmail?: string;
};

export function AcceptInviteClientForm({ token, invite, isAuthenticated, userEmail }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");

  // A) No token provided — show input to enter code/token
  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Informe o código ou link de convite recebido.
        </p>
        <div className="space-y-2">
          <Label htmlFor="codeInput">Código ou link de convite</Label>
          <Input
            id="codeInput"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="Ex: INV-XXXX-XXXX ou cole o link completo"
          />
        </div>
        <Button
          className="w-full"
          onClick={() => {
            const value = codeInput.trim();
            if (!value) return;
            router.push(`/accept-invite?t=${encodeURIComponent(value)}`);
          }}
        >
          Continuar
        </Button>
      </div>
    );
  }

  // B) Token provided but invite not found/invalid
  if (!invite) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          Convite inválido, expirado ou já utilizado.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    );
  }

  // C & D) Authenticated
  if (isAuthenticated) {
    // D) Email mismatch
    if (userEmail && userEmail !== invite.email) {
      return (
        <div className="space-y-4">
          <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            Este convite é para <strong>{invite.email}</strong>. Você está logado como{" "}
            <strong>{userEmail}</strong>.
          </p>
          <Button
            variant="outline"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await signOutAction();
              });
            }}
          >
            {isPending ? "Saindo..." : "Sair e usar outro e-mail"}
          </Button>
        </div>
      );
    }

    // C) Email matches — confirm accept
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Convite para <strong>{invite.email}</strong>. Clique abaixo para aceitar.
        </p>
        {errorMessage && (
          <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}
        <Button
          className="w-full"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await acceptInvitationAction(token);
              if (!result.ok) {
                setErrorMessage(result.message ?? "Erro ao aceitar convite");
              }
            });
          }}
        >
          {isPending ? "Aceitando..." : "Aceitar convite"}
        </Button>
      </div>
    );
  }

  // E) Not authenticated, invite found — offer register or login
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Este convite é para <strong>{invite.email}</strong>.
      </p>
      <div className="flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href={`/register?t=${encodeURIComponent(token)}`}>Criar conta</Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/login?next=${encodeURIComponent(`/accept-invite?t=${token}`)}`}>
            Já tenho conta — fazer login
          </Link>
        </Button>
      </div>
    </div>
  );
}
