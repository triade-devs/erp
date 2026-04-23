import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptInviteAction } from "@/modules/auth";
import { Button } from "@/components/ui/button";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; error?: string }>;
}) {
  const { c: companyId, error } = await searchParams;

  if (!companyId) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirect=/accept-invite?c=${companyId}`);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-lg border p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Aceitar Convite</h1>
        {error && (
          <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>
        )}
        <p className="text-muted-foreground">
          Clique no botão abaixo para aceitar o convite e acessar a empresa.
        </p>
        <form
          action={async () => {
            "use server";
            const result = await acceptInviteAction(companyId);
            if (!result.ok) {
              redirect(
                `/accept-invite?c=${companyId}&error=${encodeURIComponent(result.message ?? "Erro ao aceitar convite")}`,
              );
            }
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
