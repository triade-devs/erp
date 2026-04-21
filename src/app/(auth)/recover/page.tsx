import Link from "next/link";
import { RecoverForm } from "@/modules/auth";

export const metadata = { title: "Recuperar senha — ERP" };

export default function RecoverPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Recuperar senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu email e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <RecoverForm />
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Lembrou a senha?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
