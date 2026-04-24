import { notFound } from "next/navigation";
import Link from "next/link";
import { resolveCompany, updateRoleAction } from "@/modules/tenancy";
import { AppError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleForm } from "../role-form";

export const metadata = { title: "Editar Role — ERP" };

type Props = {
  params: Promise<{ companySlug: string; roleId: string }>;
};

export default async function EditRolePage({ params }: Props) {
  const { companySlug, roleId } = await params;

  let company: Awaited<ReturnType<typeof resolveCompany>>;
  try {
    company = await resolveCompany(companySlug);
  } catch (e) {
    if (e instanceof AppError) notFound();
    throw e;
  }

  const supabase = await createClient();
  const { data: role, error } = await supabase
    .from("roles")
    .select("id, code, name, description, is_system")
    .eq("id", roleId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (error) throw error;
  if (!role) notFound();

  const backHref = `/${companySlug}/settings/roles`;

  if (role.is_system) {
    return (
      <section className="max-w-lg space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={backHref}>← Roles</Link>
          </Button>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{role.name}</h2>
            <Badge variant="secondary">Sistema</Badge>
          </div>
        </div>

        <div className="space-y-3 rounded-md border p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Código</p>
            <p className="font-mono text-sm">{role.code}</p>
          </div>
          {role.description && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Descrição</p>
              <p className="text-sm">{role.description}</p>
            </div>
          )}
        </div>

        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Role de sistema — não editável
        </p>

        <div className="rounded-md border border-dashed p-4">
          <p className="text-sm text-muted-foreground">Matriz de permissões — em breve (PR #35)</p>
        </div>
      </section>
    );
  }

  const action = updateRoleAction.bind(null, company.id);

  return (
    <section className="max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={backHref}>← Roles</Link>
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Editar role</h2>
          <Badge variant="outline">Custom</Badge>
        </div>
      </div>

      <RoleForm
        action={action}
        backHref={backHref}
        submitLabel="Salvar alterações"
        defaultValues={{
          roleId: role.id,
          name: role.name,
          description: role.description ?? undefined,
        }}
      />

      <div className="rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">Matriz de permissões — em breve (PR #35)</p>
      </div>
    </section>
  );
}
