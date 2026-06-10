import Link from "next/link";
import { listRoleTemplates } from "@/modules/tenancy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Templates de Role — Plataforma" };

export default async function PlatformRoleTemplatesPage() {
  const templates = await listRoleTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates de Role</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo global de perfis-padrão. Edite uma vez, aplique a empresas.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/platform/role-templates/new">+ Novo template</Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum template cadastrado.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.code} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  {t.isSystem ? (
                    <Badge variant="secondary">sistema</Badge>
                  ) : (
                    <Badge variant="outline">custom</Badge>
                  )}
                </div>
                <p className="font-mono text-xs text-muted-foreground">{t.code}</p>
              </CardHeader>
              <CardContent className="flex-1">
                {t.description && (
                  <p className="mb-3 text-sm text-muted-foreground">{t.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded bg-muted px-2 py-1">
                    {t.permsCount} {t.permsCount === 1 ? "permissão" : "permissões"}
                  </span>
                  <span className="rounded bg-muted px-2 py-1">{t.instancesCount} empresas</span>
                  {t.divergentCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {t.divergentCount} divergente(s)
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/admin/platform/role-templates/${t.code}`}>Detalhes & aplicar</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
