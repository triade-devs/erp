import { ResetPasswordForm } from "@/modules/auth";

export const metadata = { title: "Redefinir senha — ERP" };

type Props = {
  searchParams: Promise<{ t?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { t } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Redefinir senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t ? "Defina sua nova senha." : "Informe o código de reset e defina uma nova senha."}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <ResetPasswordForm tokenOrShortCode={t} />
        </div>
      </div>
    </div>
  );
}
