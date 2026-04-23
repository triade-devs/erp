import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInviteAction } from "@/modules/auth";
import { Button } from "@/components/ui/button";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c: companyId } = await searchParams;

  if (!companyId) redirect("/");

  // Verificar se o usuário está autenticado
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirect=/accept-invite?c=${companyId}`);

  // Auto-accept: call the action directly from the server component
  // This removes the need for a form — just landing on the page accepts the invite
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Aceitar Convite</h1>
        <p className="text-muted-foreground">
          Clique no botão abaixo para aceitar o convite e acessar a empresa.
        </p>
        <form
          action={async () => {
            "use server";
            await acceptInviteAction(companyId);
          }}
        >
          <Button type="submit" className="w-full">
            Aceitar convite
          </Button>
        </form>
      </div>
    </div>
  );
}
