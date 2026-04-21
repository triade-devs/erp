import Link from "next/link";
import { SignInForm } from "@/modules/auth";

export const metadata = { title: "Entrar — ERP" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ERP</h1>
          <p className="mt-1 text-sm text-muted-foreground">Faça login para acessar o sistema</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <SignInForm />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
