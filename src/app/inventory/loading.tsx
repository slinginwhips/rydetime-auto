/** Dark skeleton screen for the inventory page: chips, toolbar, filter rail + card grid. */
export default function InventoryLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading inventory">
      {/* Page heading */}
      <div className="skeleton h-8 w-64" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full" />

      {/* Quick filter chips */}
      <div className="mt-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-28 flex-shrink-0 rounded-full" />
        ))}
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="skeleton h-9 w-24" />
        <div className="skeleton h-9 w-44" />
      </div>

      <div className="mt-6 flex gap-8">
        {/* Filter rail (desktop) */}
        <div className="hidden w-64 flex-shrink-0 space-y-6 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="skeleton h-3 w-20" />
              <div className="skeleton mt-3 h-9 w-full" />
            </div>
          ))}
        </div>

        {/* Card grid */}
        <div className="min-w-0 flex-1">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-border-subtle bg-background-card">
                <div className="skeleton aspect-[4/3] w-full rounded-none" />
                <div className="p-4">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="mt-3 flex items-center justify-between">
                    <div className="skeleton h-6 w-24" />
                    <div className="skeleton h-4 w-16" />
                  </div>
                  <div className="skeleton mt-3 h-4 w-28" />
                  <div className="mt-4 flex gap-2">
                    <div className="skeleton h-9 flex-1" />
                    <div className="skeleton h-9 flex-1" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
