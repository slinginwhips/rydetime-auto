/**
 * Generic dark-theme route-load skeleton. Shape works for any route:
 * a hero-ish block of text lines, then a 4-up card grid. Uses the
 * `.skeleton` pulse from globals.css with a static fallback background
 * for prefers-reduced-motion.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading page">
      {/* Hero-shaped block */}
      <div className="max-w-3xl">
        <div className="skeleton h-3 w-48 bg-background-card" />
        <div className="skeleton mt-5 h-12 w-full max-w-xl bg-background-card" />
        <div className="skeleton mt-3 h-12 w-2/3 bg-background-card" />
        <div className="skeleton mt-6 h-5 w-full max-w-md bg-background-card" />
        <div className="mt-8 flex gap-3">
          <div className="skeleton h-12 w-44 bg-background-card" />
          <div className="skeleton h-12 w-40 bg-background-card" />
        </div>
      </div>

      {/* Card grid */}
      <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-border-subtle">
            <div className="skeleton aspect-[4/3] w-full rounded-none bg-background-card" />
            <div className="p-4">
              <div className="skeleton h-4 w-3/4 bg-background-card" />
              <div className="skeleton mt-3 h-3 w-1/2 bg-background-card" />
              <div className="skeleton mt-4 h-5 w-1/3 bg-background-card" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
