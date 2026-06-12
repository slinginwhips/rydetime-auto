/** Dark skeleton screen for the vehicle detail page: gallery + sticky action column. */
export default function VehicleDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading vehicle details">
      {/* Breadcrumb */}
      <div className="skeleton h-4 w-72 max-w-full" />

      {/* Title (mobile) */}
      <div className="mt-4 lg:hidden">
        <div className="skeleton h-7 w-64 max-w-full" />
        <div className="skeleton mt-3 h-8 w-44" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        {/* Main column */}
        <div className="min-w-0 space-y-10">
          {/* Gallery */}
          <div>
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="mt-3 flex gap-2 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-16 w-24 flex-shrink-0 rounded" />
              ))}
            </div>
          </div>

          {/* Specs grid */}
          <div>
            <div className="skeleton h-6 w-40" />
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="border-b border-border-subtle pb-2">
                  <div className="skeleton h-3 w-16" />
                  <div className="skeleton mt-2 h-4 w-24" />
                </div>
              ))}
            </div>
          </div>

          {/* Description blocks */}
          <div>
            <div className="skeleton h-6 w-56" />
            <div className="mt-4 space-y-2">
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
            </div>
          </div>
        </div>

        {/* Sticky right column */}
        <div className="hidden lg:block">
          <div className="space-y-5">
            <div>
              <div className="skeleton h-7 w-64 max-w-full" />
              <div className="skeleton mt-3 h-10 w-40" />
              <div className="skeleton mt-2 h-4 w-56" />
            </div>
            <div className="skeleton h-40 w-full" />
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
