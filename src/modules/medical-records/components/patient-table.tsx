import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationNav } from "@/components/ui/pagination-nav";
import type { MedicalPatient, PaginatedResult } from "../types";

type Props = Pick<PaginatedResult<MedicalPatient>, "data" | "page" | "total" | "totalPages"> & {
  basePath: string;
  searchQuery?: string;
};

export function PatientTable({ data, page, total, totalPages, basePath, searchQuery }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
        {searchQuery
          ? `Nenhum paciente encontrado para "${searchQuery}".`
          : "Nenhum paciente cadastrado."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((patient) => (
              <TableRow key={patient.id}>
                <TableCell>
                  <Link href={`${basePath}/${patient.id}`} className="font-medium hover:underline">
                    {patient.full_name}
                  </Link>
                  {patient.birth_date && (
                    <p className="text-xs text-muted-foreground">
                      Nascimento:{" "}
                      {new Date(`${patient.birth_date}T00:00:00`).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </TableCell>
                <TableCell>{patient.document ?? "—"}</TableCell>
                <TableCell>{patient.phone ?? patient.email ?? "—"}</TableCell>
                <TableCell>
                  {patient.is_archived ? (
                    <Badge variant="outline">Arquivado</Badge>
                  ) : (
                    <Badge variant="secondary">Ativo</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} paciente{total !== 1 ? "s" : ""}
        </span>
        <PaginationNav
          page={page}
          totalPages={totalPages}
          buildHref={(p) => {
            const params = new URLSearchParams();
            params.set("page", String(p));
            if (searchQuery) params.set("q", searchQuery);
            return `${basePath}?${params.toString()}`;
          }}
        />
      </div>
    </div>
  );
}
