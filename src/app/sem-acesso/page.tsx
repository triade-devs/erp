import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser, signOutAction } from "@/modules/auth";

export const metadata = { title: "Sem acesso — ERP" };

export default async function SemAcessoPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-2xl font-bold">Acesso não disponível</h1>
        <p className="max-w-sm text-muted-foreground">
          A conta <span className="font-medium text-foreground">{user.email}</span> não possui
          acesso a nenhuma empresa no momento.
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Isso pode ocorrer porque você ainda não foi adicionado a uma empresa, seu acesso foi
          suspenso, ou nenhum perfil de acesso foi atribuído à sua conta. Entre em contato com o
          administrador da sua empresa.
        </p>
      </div>

      <form action={signOutAction}>
        <Button type="submit" variant="outline">
          Sair da conta
        </Button>
      </form>
    </div>
  );
}
