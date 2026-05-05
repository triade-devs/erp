import { SignUpForm } from "@/modules/auth";

export const metadata = { title: "Cadastro — ERP" };

type Props = {
  searchParams: Promise<{ t?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  const { t } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">ERP</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t ? "Complete seu cadastro" : "Crie sua conta com convite"}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <SignUpForm inviteToken={t} />
        </div>
      </div>
    </div>
  );
}
