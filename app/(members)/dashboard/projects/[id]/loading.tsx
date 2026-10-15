/* Static board skeleton: header lines, tabs, five empty columns. No shimmer. */

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only" role="status">
        Loading the board…
      </span>
      <div className="flex flex-col gap-3">
        <div className="h-4 w-24 rounded-control bg-surface-1" />
        <div className="h-8 w-80 max-w-full rounded-control bg-surface-1" />
        <div className="h-4 w-64 max-w-full rounded-control bg-surface-1" />
      </div>
      <div className="h-12 border-b border-line" />
      <div className="ml-[calc(50%-50vw)] flex w-screen gap-3 overflow-hidden px-gutter">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex h-80 w-[85vw] flex-none flex-col gap-2 rounded-card bg-surface-1 p-2 sm:w-[18rem]">
            <div className="m-1 h-5 w-28 rounded-control bg-surface-2" />
            {i < 3 ? <div className="h-20 rounded-card border border-line bg-surface" /> : null}
            {i < 2 ? <div className="h-20 rounded-card border border-line bg-surface" /> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
