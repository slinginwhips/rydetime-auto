"use client";

/**
 * Small client button that opens the site-wide AI chat widget by
 * dispatching the "rydetime:open-chat" CustomEvent on window.
 */
export default function AskAIButton({
  label = "Ask AI",
  className,
  vehicleId,
}: {
  label?: string;
  className?: string;
  vehicleId?: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        window.dispatchEvent(
          new CustomEvent("rydetime:open-chat", {
            detail: vehicleId ? { vehicle_id: vehicleId } : undefined,
          })
        )
      }
      className={
        className ??
        "inline-flex items-center justify-center gap-2 rounded-md border border-border-subtle bg-surface px-6 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-accent hover:text-accent"
      }
    >
      <span aria-hidden="true">💬</span>
      {label}
    </button>
  );
}
