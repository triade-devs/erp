import {
  listClassifications,
  createClassificationAction,
  deleteClassificationAction,
} from "@/modules/inventory";
import { resolveCompany } from "@/modules/tenancy";
import { Can } from "@/modules/authz";
import { ClassificationsManager } from "./classifications-manager";

export const metadata = { title: "Classificações — ERP" };

type Props = {
  params: Promise<{ companySlug: string }>;
};

export default async function ClassificationsPage({ params }: Props) {
  const { companySlug } = await params;
  const company = await resolveCompany(companySlug);
  const classifications = await listClassifications(company.id);

  return (
    <Can
      permission="inventory:product:update"
      fallback={
        <p className="text-sm text-muted-foreground">
          Sem permissão para gerenciar classificações.
        </p>
      }
    >
      <ClassificationsManager
        classifications={classifications}
        createAction={createClassificationAction}
        deleteAction={deleteClassificationAction}
      />
    </Can>
  );
}
