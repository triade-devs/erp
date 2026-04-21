import Link from "next/link";
import { SignUpForm } from "@/modules/auth";

export const metadata = { title: "Cadastro — ERP" };

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ERP</h1>
          <p className="mt-1 text-sm text-muted-foreground">Crie sua conta</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <SignUpForm />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
