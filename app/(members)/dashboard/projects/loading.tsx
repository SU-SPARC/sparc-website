/* Static skeleton: header, then 6 card blocks. No shimmer (brief §0). */

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading projects…
      </span>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium text-ink">Projects</h1>
      </div>
      <div className="h-9 w-80 max-w-full rounded-pill bg-surface-1" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="h-64 rounded-card border border-line bg-surface-1" />
        ))}
      </ul>
    </div>
  );
}
