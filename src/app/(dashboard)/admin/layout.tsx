import { createClient } from "@/lib/supabase/server";

/**
 * Layout de proteção para rotas /admin/*.
 * Verifica is_platform_admin() e renderiza 403 inline se não autorizado.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: isPlatformAdmin, error: rpcError } = await supabase.rpc("is_platform_admin");
  if (rpcError) throw rpcError;

  if (!isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="text-2xl font-bold text-destructive">Acesso negado</h1>
        <p className="mt-2 text-muted-foreground">Você não tem permissão para acessar esta área.</p>
      </div>
    );
  }

  return <>{children}</>;
}
