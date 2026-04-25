export default function ProductDetailLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="mb-2 h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-7 w-28 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-muted/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
