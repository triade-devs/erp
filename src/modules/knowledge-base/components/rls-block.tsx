type Policy = {
  name: string;
  operation: string;
  description: string;
};

type Props = {
  policies: Policy[];
};

export function RlsBlock({ policies }: Props) {
  return (
    <div className="my-4 rounded-md border bg-muted/30 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Políticas RLS
      </p>
      <ul className="space-y-2">
        {policies.map((p) => (
          <li key={p.name} className="flex gap-3 text-sm">
            <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-medium">
              {p.operation}
            </span>
            <div>
              <span className="font-medium">{p.name}</span>
              {" — "}
              <span className="text-muted-foreground">{p.description}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
