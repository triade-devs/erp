export default function MovementsLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-72 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-muted/60" />
          ))}
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
