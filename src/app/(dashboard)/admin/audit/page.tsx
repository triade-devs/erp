import Link from "next/link";
import { listAuditLogsGlobal, AuditLogTable } from "@/modules/audit";
import { listAllCompanies } from "@/modules/tenancy";

type Props = {
  searchParams: Promise<{ companyId?: string; action?: string; status?: string }>;
};

export default async function GlobalAuditPage({ searchParams }: Props) {
  const filters = await searchParams;
  const [logs, companies] = await Promise.all([
    listAuditLogsGlobal({
      companyId: filters.companyId,
      action: filters.action,
      status: filters.status,
    }),
    listAllCompanies(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoria Global</h1>
        <p className="text-sm text-muted-foreground">
          Todos os eventos da plataforma — {logs.length} registros
        </p>
      </div>

      <form className="flex flex-wrap gap-3">
        <select
          name="companyId"
          defaultValue={filters.companyId ?? ""}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas as empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          name="action"
          defaultValue={filters.action ?? ""}
          placeholder="Filtrar por ação..."
          className="rounded-md border bg-background px-3 py-2 text-sm"
        />

        <select
          name="status"
          defaultValue={filters.status ?? ""}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="success">success</option>
          <option value="denied">denied</option>
          <option value="error">error</option>
        </select>

        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Filtrar
        </button>

        {(filters.companyId || filters.action || filters.status) && (
          <Link
            href="/admin/audit"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Limpar
          </Link>
        )}
      </form>

      <AuditLogTable logs={logs} />
    </div>
  );
}
