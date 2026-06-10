import { notFound } from "next/navigation";
import { getTemplateWithPermissions, getTemplateApplyPreview } from "@/modules/tenancy";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EditTemplateForm } from "./edit-template-form";
import { TemplatePermissionsMatrix } from "./template-permissions-matrix";
import { ApplyTemplateDialog } from "./apply-template-dialog";

type Props = { params: Promise<{ code: string }> };

export default async function RoleTemplateDetailPage({ params }: Props) {
  const { code } = await params;
  const [detail, preview] = await Promise.all([
    getTemplateWithPermissions(code),
    getTemplateApplyPreview(code),
  ]);

  if (!detail) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{detail.name}</h1>
            {detail.isSystem ? (
              <Badge variant="secondary">sistema</Badge>
            ) : (
              <Badge variant="outline">custom</Badge>
            )}
          </div>
          <p className="font-mono text-sm text-muted-foreground">{code}</p>
          {detail.description && (
            <p className="mt-2 text-sm text-muted-foreground">{detail.description}</p>
          )}
        </div>
        <ApplyTemplateDialog templateCode={code} preview={preview} />
      </div>

      <Tabs defaultValue="permissions">
        <TabsList>
          <TabsTrigger value="permissions">Permissões</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="pt-4">
          <TemplatePermissionsMatrix templateCode={code} modules={detail.modules} />
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <EditTemplateForm
            code={code}
            initialValues={{
              name: detail.name,
              description: detail.description,
              sort_order: detail.sortOrder,
            }}
            isSystem={detail.isSystem}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
