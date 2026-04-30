type Field = {
  name: string;
  type: string;
  nullable?: boolean;
  description?: string;
  references?: string;
};

type Props = {
  fields: Field[];
};

export function TableSpec({ fields }: Props) {
  return (
    <div className="my-4 overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Coluna</th>
            <th className="px-4 py-2 text-left font-medium">Tipo</th>
            <th className="px-4 py-2 text-left font-medium">Nulo?</th>
            <th className="px-4 py-2 text-left font-medium">Descrição</th>
            <th className="px-4 py-2 text-left font-medium">Referência</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name} className="border-t">
              <td className="px-4 py-2 font-mono text-xs">{f.name}</td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{f.type}</td>
              <td className="px-4 py-2 text-center">{f.nullable ? "✓" : "✗"}</td>
              <td className="px-4 py-2">{f.description ?? "—"}</td>
              <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                {f.references ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
