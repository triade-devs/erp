import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSystemRolePermissions,
  listAllRoles,
  AdminSystemRolesTab,
  AdminAllRolesTab,
} from "@/modules/tenancy";
import { createClient } from "@/lib/supabase/server";

const SYSTEM_ROLE_CODES = ["owner", "manager", "operator"] as const;

export default async function PlatformRolesPage() {
  const supabase = await createClient();

  const { data: sysRoles } = await supabase
    .from("roles")
    .select("code")
    .eq("is_system", true)
    .in("code", [...SYSTEM_ROLE_CODES]);

  const existingCodes = [...new Set((sysRoles ?? []).map((r) => r.code))];

  const [matrices, allRoles] = await Promise.all([
    Promise.all(existingCodes.map((code) => getSystemRolePermissions(code))),
    listAllRoles(),
  ]);

  const initialMatrices: Record<string, Awaited<ReturnType<typeof getSystemRolePermissions>>> = {};
  for (let i = 0; i < existingCodes.length; i++) {
    initialMatrices[existingCodes[i]!] = matrices[i]!;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie roles-sistema (com propagação global) e visualize roles de todas as empresas
        </p>
      </div>

      <Tabs defaultValue="system">
        <TabsList>
          <TabsTrigger value="system">Roles Sistema</TabsTrigger>
          <TabsTrigger value="all">Por Empresa ({allRoles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="pt-4">
          <AdminSystemRolesTab roleCodes={existingCodes} initialMatrices={initialMatrices} />
        </TabsContent>

        <TabsContent value="all" className="pt-4">
          <AdminAllRolesTab roles={allRoles} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
