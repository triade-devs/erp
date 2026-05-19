import { createClient } from "@/lib/supabase/server";
import { getInvitationByTokenOrCode } from "@/modules/tenancy";
import { AcceptInviteClientForm } from "./accept-invite-client-form";

type Props = {
  searchParams: Promise<{ t?: string; error?: string }>;
};

export default async function AcceptInvitePage({ searchParams }: Props) {
  const { t: token, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let invite = null;
  if (token) {
    invite = await getInvitationByTokenOrCode(token).catch(() => null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Aceitar Convite</h1>
        {error && (
          <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {decodeURIComponent(error)}
          </p>
        )}
        <AcceptInviteClientForm
          token={token}
          invite={invite}
          isAuthenticated={!!user}
          userEmail={user?.email}
        />
      </div>
    </div>
  );
}
